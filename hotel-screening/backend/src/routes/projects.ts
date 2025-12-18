import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const createProjectSchema = z.object({
  rol: z.enum(['inversor','operador','banco']).optional().default('inversor'),
  nombre: z.string().min(2),
  comunidad_autonoma: z.string().min(2),
  provincia: z.string().min(2),
  zona: z.string().min(2),
  segmento: z.enum(['urbano','vacacional']),
  categoria: z.enum(['economy','midscale','upper_midscale','upscale','upper_upscale','luxury']),
  habitaciones: z.number().int().positive(),
  horizonte: z.number().int().min(1).max(40).default(7),
  moneda: z.string().length(3).default('EUR')
});

const updateConfigSchema = z.object({
  // Datos del proyecto
  nombre: z.string().min(2).optional(),
  comunidad_autonoma: z.string().min(2).optional(),
  provincia: z.string().min(2).optional(),
  zona: z.string().min(2).optional(),
  segmento: z.enum(['urbano','vacacional']).optional(),
  categoria: z.enum(['economy','midscale','upper_midscale','upscale','upper_upscale','luxury']).optional(),
  habitaciones: z.number().int().positive().optional(),
  horizonte: z.number().int().min(1).max(40).optional(),
  moneda: z.string().length(3).optional(),
  rol: z.enum(['inversor','operador','banco']).optional(),

  // Financiación
  precio_compra: z.number().optional(),
  capex_inicial: z.number().optional(),
  ltv: z.number().min(0).max(1).optional(),
  interes: z.number().min(0).max(1).optional(),
  plazo_anios: z.number().int().min(0).max(40).optional(), // 0 = sin financiación
  tipo_amortizacion: z.enum(['frances','bullet']).optional(),

  // Operator contract
  operacion_tipo: z.enum(['gestion_propia','operador']).optional(),
  fee_base_anual: z.number().nullable().optional(),
  fee_pct_total_rev: z.number().min(0).max(1).nullable().optional(),
  fee_pct_gop: z.number().min(0).max(1).nullable().optional(),
  fee_incentive_pct: z.number().min(0).max(1).nullable().optional(),
  fee_hurdle_gop_margin: z.number().min(0).max(1).nullable().optional(),
  gop_ajustado: z.boolean().optional(),

  // Settings
  ffe: z.number().min(0).max(1).optional(),
  metodo_valoracion: z.enum(['cap_rate','multiplo']).optional(),
  cap_rate_salida: z.number().min(0).max(1).nullable().optional(),
  multiplo_salida: z.number().nullable().optional(),
  coste_tx_compra_pct: z.number().min(0).max(1).nullable().optional(),
  coste_tx_venta_pct: z.number().min(0).max(1).optional(),

  // Non-operating
  nonop_taxes_anual: z.number().optional(),
  nonop_insurance_anual: z.number().optional(),
  nonop_rent_anual: z.number().optional(),
  nonop_other_anual: z.number().optional(),

  // Projection assumptions
  adr_growth_pct: z.number().optional(),
  occ_delta_pp: z.number().optional(),
  occ_cap: z.number().optional(),
  cost_inflation_pct: z.number().optional(),
  undistributed_inflation_pct: z.number().optional(),
  nonop_inflation_pct: z.number().optional(),
});

router.get('/v1/projects', async (req, res) => {
  const email = (req as any).userEmail as string;
  const [rows] = await pool.query(
    `SELECT project_id, nombre, rol, comunidad_autonoma, provincia, zona, segmento, categoria, habitaciones, horizonte, estado, project_type, snapshot_finalizado, created_at, updated_at
       FROM projects
      WHERE owner_email=?
      ORDER BY updated_at DESC`,
    [email]
  );
  res.json(rows);
});

router.post('/v1/projects', async (req,res)=>{
  const email = (req as any).userEmail as string;
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const id = uuidv4();
  const p = parsed.data;
  await pool.query(
    `INSERT INTO projects (project_id, owner_email, rol, nombre, comunidad_autonoma, provincia, zona, segmento, categoria, habitaciones, horizonte, moneda)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, email, p.rol, p.nombre, p.comunidad_autonoma, p.provincia, p.zona, p.segmento, p.categoria, p.habitaciones, p.horizonte, p.moneda]
  );

  // defaults mínimos
  await pool.query(`INSERT INTO project_settings (project_id) VALUES (?)`, [id]);
  await pool.query(`INSERT INTO nonoperating_assumptions (project_id) VALUES (?)`, [id]);
  await pool.query(`INSERT INTO operator_contracts (project_id, operacion_tipo) VALUES (?, 'operador')`, [id]);

  res.status(201).json({ project_id: id });
});

// GET /v1/projects/:id/config - Obtener configuración completa del proyecto
router.get('/v1/projects/:id/config', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const project = projectRows[0];

  // Obtener settings
  const [settingsRows] = await pool.query<any[]>(
    `SELECT * FROM project_settings WHERE project_id=?`,
    [projectId]
  );
  const settings = settingsRows?.[0] || {};

  // Obtener financing
  const [financingRows] = await pool.query<any[]>(
    `SELECT * FROM financing_terms WHERE project_id=?`,
    [projectId]
  );
  const financing = financingRows?.[0] || {};

  // Obtener operator contract
  const [operatorRows] = await pool.query<any[]>(
    `SELECT * FROM operator_contracts WHERE project_id=?`,
    [projectId]
  );
  const operator = operatorRows?.[0] || {};

  // Obtener nonoperating
  const [nonopRows] = await pool.query<any[]>(
    `SELECT * FROM nonoperating_assumptions WHERE project_id=?`,
    [projectId]
  );
  const nonop = nonopRows?.[0] || {};

  // Obtener projection assumptions
  const [projectionRows] = await pool.query<any[]>(
    `SELECT * FROM projection_assumptions WHERE project_id=?`,
    [projectId]
  );
  const projectionAssumptions = projectionRows?.[0] || {};

  // Combinar todo
  const config = {
    // Proyecto
    nombre: project.nombre,
    comunidad_autonoma: project.comunidad_autonoma,
    provincia: project.provincia,
    zona: project.zona,
    segmento: project.segmento,
    categoria: project.categoria,
    habitaciones: project.habitaciones,
    horizonte: project.horizonte,
    moneda: project.moneda,
    rol: project.rol,

    // Financiación
    precio_compra: financing.precio_compra,
    capex_inicial: financing.capex_inicial,
    ltv: financing.ltv,
    interes: financing.interes,
    plazo_anios: financing.plazo_anios,
    tipo_amortizacion: financing.tipo_amortizacion,

    // Operator
    operacion_tipo: operator.operacion_tipo,
    fee_base_anual: operator.fee_base_anual,
    fee_pct_total_rev: operator.fee_pct_total_rev,
    fee_pct_gop: operator.fee_pct_gop,
    fee_incentive_pct: operator.fee_incentive_pct,
    fee_hurdle_gop_margin: operator.fee_hurdle_gop_margin,
    gop_ajustado: operator.gop_ajustado,

    // Settings
    ffe: settings.ffe,
    metodo_valoracion: settings.metodo_valoracion,
    cap_rate_salida: settings.cap_rate_salida,
    multiplo_salida: settings.multiplo_salida,
    coste_tx_compra_pct: settings.coste_tx_compra_pct,
    coste_tx_venta_pct: settings.coste_tx_venta_pct,

    // Non-operating
    nonop_taxes_anual: nonop.nonop_taxes_anual,
    nonop_insurance_anual: nonop.nonop_insurance_anual,
    nonop_rent_anual: nonop.nonop_rent_anual,
    nonop_other_anual: nonop.nonop_other_anual,

    // Projection assumptions
    adr_growth_pct: projectionAssumptions.adr_growth_pct,
    occ_delta_pp: projectionAssumptions.occ_delta_pp,
    occ_cap: projectionAssumptions.occ_cap,
    cost_inflation_pct: projectionAssumptions.cost_inflation_pct,
    undistributed_inflation_pct: projectionAssumptions.undistributed_inflation_pct,
    nonop_inflation_pct: projectionAssumptions.nonop_inflation_pct,
  };

  res.json(config);
});

// PUT /v1/projects/:id/config - Actualizar configuración completa del proyecto
router.put('/v1/projects/:id/config', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  const parsed = updateConfigSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const data = parsed.data;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Actualizar tabla projects
  const projectUpdates: any = {};
  if (data.nombre !== undefined) projectUpdates.nombre = data.nombre;
  if (data.comunidad_autonoma !== undefined) projectUpdates.comunidad_autonoma = data.comunidad_autonoma;
  if (data.provincia !== undefined) projectUpdates.provincia = data.provincia;
  if (data.zona !== undefined) projectUpdates.zona = data.zona;
  if (data.segmento !== undefined) projectUpdates.segmento = data.segmento;
  if (data.categoria !== undefined) projectUpdates.categoria = data.categoria;
  if (data.habitaciones !== undefined) projectUpdates.habitaciones = data.habitaciones;
  if (data.horizonte !== undefined) projectUpdates.horizonte = data.horizonte;
  if (data.moneda !== undefined) projectUpdates.moneda = data.moneda;
  if (data.rol !== undefined) projectUpdates.rol = data.rol;

  if (Object.keys(projectUpdates).length > 0) {
    const setClauses = Object.keys(projectUpdates).map(k => `${k}=?`).join(', ');
    const values = Object.values(projectUpdates);
    await pool.query(
      `UPDATE projects SET ${setClauses} WHERE project_id=?`,
      [...values, projectId]
    );
  }

  // Actualizar financing_terms
  const financingUpdates: any = {};
  if (data.precio_compra !== undefined) financingUpdates.precio_compra = data.precio_compra;
  if (data.capex_inicial !== undefined) financingUpdates.capex_inicial = data.capex_inicial;
  if (data.ltv !== undefined) financingUpdates.ltv = data.ltv;
  if (data.interes !== undefined) financingUpdates.interes = data.interes;
  if (data.plazo_anios !== undefined) financingUpdates.plazo_anios = data.plazo_anios;
  if (data.tipo_amortizacion !== undefined) financingUpdates.tipo_amortizacion = data.tipo_amortizacion;

  if (Object.keys(financingUpdates).length > 0) {
    // Verificar si existe
    const [existingFin] = await pool.query<any[]>(
      `SELECT project_id FROM financing_terms WHERE project_id=?`,
      [projectId]
    );

    if (existingFin && existingFin.length > 0) {
      const setClauses = Object.keys(financingUpdates).map(k => `${k}=?`).join(', ');
      const values = Object.values(financingUpdates);
      await pool.query(
        `UPDATE financing_terms SET ${setClauses} WHERE project_id=?`,
        [...values, projectId]
      );
    } else {
      // Crear si no existe
      await pool.query(
        `INSERT INTO financing_terms (project_id, precio_compra, capex_inicial, ltv, interes, plazo_anios, tipo_amortizacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectId, financingUpdates.precio_compra, financingUpdates.capex_inicial,
         financingUpdates.ltv, financingUpdates.interes, financingUpdates.plazo_anios,
         financingUpdates.tipo_amortizacion]
      );
    }
  }

  // Actualizar operator_contracts
  const operatorUpdates: any = {};
  if (data.operacion_tipo !== undefined) operatorUpdates.operacion_tipo = data.operacion_tipo;
  if (data.fee_base_anual !== undefined) operatorUpdates.fee_base_anual = data.fee_base_anual;
  if (data.fee_pct_total_rev !== undefined) operatorUpdates.fee_pct_total_rev = data.fee_pct_total_rev;
  if (data.fee_pct_gop !== undefined) operatorUpdates.fee_pct_gop = data.fee_pct_gop;
  if (data.fee_incentive_pct !== undefined) operatorUpdates.fee_incentive_pct = data.fee_incentive_pct;
  if (data.fee_hurdle_gop_margin !== undefined) operatorUpdates.fee_hurdle_gop_margin = data.fee_hurdle_gop_margin;
  if (data.gop_ajustado !== undefined) operatorUpdates.gop_ajustado = data.gop_ajustado;

  if (Object.keys(operatorUpdates).length > 0) {
    const setClauses = Object.keys(operatorUpdates).map(k => `${k}=?`).join(', ');
    const values = Object.values(operatorUpdates);
    await pool.query(
      `UPDATE operator_contracts SET ${setClauses} WHERE project_id=?`,
      [...values, projectId]
    );
  }

  // Actualizar project_settings
  const settingsUpdates: any = {};
  if (data.ffe !== undefined) settingsUpdates.ffe = data.ffe;
  if (data.metodo_valoracion !== undefined) settingsUpdates.metodo_valoracion = data.metodo_valoracion;
  if (data.cap_rate_salida !== undefined) settingsUpdates.cap_rate_salida = data.cap_rate_salida;
  if (data.multiplo_salida !== undefined) settingsUpdates.multiplo_salida = data.multiplo_salida;
  if (data.coste_tx_compra_pct !== undefined) settingsUpdates.coste_tx_compra_pct = data.coste_tx_compra_pct;
  if (data.coste_tx_venta_pct !== undefined) settingsUpdates.coste_tx_venta_pct = data.coste_tx_venta_pct;

  if (Object.keys(settingsUpdates).length > 0) {
    const setClauses = Object.keys(settingsUpdates).map(k => `${k}=?`).join(', ');
    const values = Object.values(settingsUpdates);
    await pool.query(
      `UPDATE project_settings SET ${setClauses} WHERE project_id=?`,
      [...values, projectId]
    );
  }

  // Actualizar nonoperating_assumptions
  const nonopUpdates: any = {};
  if (data.nonop_taxes_anual !== undefined) nonopUpdates.nonop_taxes_anual = data.nonop_taxes_anual;
  if (data.nonop_insurance_anual !== undefined) nonopUpdates.nonop_insurance_anual = data.nonop_insurance_anual;
  if (data.nonop_rent_anual !== undefined) nonopUpdates.nonop_rent_anual = data.nonop_rent_anual;
  if (data.nonop_other_anual !== undefined) nonopUpdates.nonop_other_anual = data.nonop_other_anual;

  if (Object.keys(nonopUpdates).length > 0) {
    const setClauses = Object.keys(nonopUpdates).map(k => `${k}=?`).join(', ');
    const values = Object.values(nonopUpdates);
    await pool.query(
      `UPDATE nonoperating_assumptions SET ${setClauses} WHERE project_id=?`,
      [...values, projectId]
    );
  }

  // Actualizar projection_assumptions
  const projectionAssumptionUpdates: any = {};
  if (data.adr_growth_pct !== undefined) projectionAssumptionUpdates.adr_growth_pct = data.adr_growth_pct;
  if (data.occ_delta_pp !== undefined) projectionAssumptionUpdates.occ_delta_pp = data.occ_delta_pp;
  if (data.occ_cap !== undefined) projectionAssumptionUpdates.occ_cap = data.occ_cap;
  if (data.cost_inflation_pct !== undefined) projectionAssumptionUpdates.cost_inflation_pct = data.cost_inflation_pct;
  if (data.undistributed_inflation_pct !== undefined) projectionAssumptionUpdates.undistributed_inflation_pct = data.undistributed_inflation_pct;
  if (data.nonop_inflation_pct !== undefined) projectionAssumptionUpdates.nonop_inflation_pct = data.nonop_inflation_pct;

  if (Object.keys(projectionAssumptionUpdates).length > 0) {
    // Intentar UPDATE primero, si no existe el registro, hacer INSERT
    const [existingRows]: any = await pool.query(
      `SELECT project_id FROM projection_assumptions WHERE project_id=?`,
      [projectId]
    );

    if (existingRows && existingRows.length > 0) {
      // Registro existe, hacer UPDATE
      const setClauses = Object.keys(projectionAssumptionUpdates).map(k => `${k}=?`).join(', ');
      const values = Object.values(projectionAssumptionUpdates);
      await pool.query(
        `UPDATE projection_assumptions SET ${setClauses} WHERE project_id=?`,
        [...values, projectId]
      );
    } else {
      // Registro no existe, hacer INSERT con defaults
      await pool.query(
        `INSERT INTO projection_assumptions
         (project_id, adr_growth_pct, occ_delta_pp, occ_cap, cost_inflation_pct, undistributed_inflation_pct, nonop_inflation_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          projectionAssumptionUpdates.adr_growth_pct ?? 0.05,
          projectionAssumptionUpdates.occ_delta_pp ?? 1.0,
          projectionAssumptionUpdates.occ_cap ?? 0.92,
          projectionAssumptionUpdates.cost_inflation_pct ?? 0.02,
          projectionAssumptionUpdates.undistributed_inflation_pct ?? 0.02,
          projectionAssumptionUpdates.nonop_inflation_pct ?? 0.02
        ]
      );
    }
  }

  res.json({ success: true, project_id: projectId });
});

// DELETE /v1/projects/:id - Eliminar proyecto (eliminación en cascada automática)
router.delete('/v1/projects/:id', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Eliminar el proyecto (la cascada eliminará automáticamente todos los datos relacionados)
  await pool.query(
    `DELETE FROM projects WHERE project_id=?`,
    [projectId]
  );

  res.json({ success: true, project_id: projectId });
});

// GET /v1/projects/:id/edited-fields - Obtener campos editados del proyecto
router.get('/v1/projects/:id/edited-fields', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Obtener campos editados
  const [fields] = await pool.query<any[]>(
    `SELECT step, campo, mes, anio FROM edited_fields_log WHERE project_id=? ORDER BY created_at ASC`,
    [projectId]
  );

  res.json(fields);
});

// POST /v1/projects/:id/edited-fields - Guardar campos editados del proyecto
router.post('/v1/projects/:id/edited-fields', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Esperar un array de objetos: [{ step: 1, campo: 'dias', mes: 1 }, ...]
  const fields = req.body;
  if (!Array.isArray(fields)) {
    return res.status(400).json({ error: 'Se esperaba un array de campos editados' });
  }

  // Eliminar registros antiguos del proyecto
  await pool.query(
    `DELETE FROM edited_fields_log WHERE project_id=?`,
    [projectId]
  );

  // Insertar nuevos registros
  if (fields.length > 0) {
    const values = fields.map((f: any) => [
      projectId,
      f.step,
      f.campo,
      f.mes || null,
      f.anio || null
    ]);

    await pool.query(
      `INSERT INTO edited_fields_log (project_id, step, campo, mes, anio) VALUES ?`,
      [values]
    );
  }

  res.json({ success: true, count: fields.length });
});

// GET /v1/projects/:id/sensitivity-scenarios - Obtener escenarios de sensibilidad del proyecto
router.get('/v1/projects/:id/sensitivity-scenarios', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Obtener escenarios
  const [scenarios] = await pool.query<any[]>(
    `SELECT scenario_id as id, scenario_name as name, adr_delta_pct, occ_delta_pp
     FROM sensitivity_scenarios
     WHERE project_id=?
     ORDER BY created_at ASC`,
    [projectId]
  );

  res.json(scenarios);
});

// POST /v1/projects/:id/sensitivity-scenarios - Guardar escenarios de sensibilidad del proyecto
router.post('/v1/projects/:id/sensitivity-scenarios', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Esperar un array de objetos: [{ name: 'Escenario', adr_delta_pct: 0.02, occ_delta_pp: 1.0 }, ...]
  const scenarios = req.body;
  if (!Array.isArray(scenarios)) {
    return res.status(400).json({ error: 'Se esperaba un array de escenarios' });
  }

  // Eliminar escenarios antiguos del proyecto
  await pool.query(
    `DELETE FROM sensitivity_scenarios WHERE project_id=?`,
    [projectId]
  );

  // Insertar nuevos escenarios
  if (scenarios.length > 0) {
    const values = scenarios.map((s: any) => [
      projectId,
      s.name,
      s.adr_delta_pct,
      s.occ_delta_pp
    ]);

    await pool.query(
      `INSERT INTO sensitivity_scenarios (project_id, scenario_name, adr_delta_pct, occ_delta_pp) VALUES ?`,
      [values]
    );
  }

  res.json({ success: true, count: scenarios.length });
});

// POST /v1/projects/:id/finalize-operador - Finalizar proyecto como operador (paso 3)
router.post('/v1/projects/:id/finalize-operador', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const project = projectRows[0];

  // Verificar que el proyecto esté en estado 'projection_2n' (paso 3 completado)
  if (project.estado !== 'projection_2n') {
    return res.status(400).json({ error: 'El proyecto debe estar en estado projection_2n (paso 3 completado) para finalizarse como operador' });
  }

  // Validar que tenga HTML content
  const htmlContent = req.body.htmlContent;
  if (!htmlContent || typeof htmlContent !== 'string') {
    return res.status(400).json({ error: 'Se requiere htmlContent en el body' });
  }

  try {
    // Guardar snapshot HTML
    await pool.query(
      `INSERT INTO project_snapshots (project_id, html_content, finalized_at)
       VALUES (?, ?, NOW(3))
       ON DUPLICATE KEY UPDATE html_content=VALUES(html_content), finalized_at=NOW(3)`,
      [projectId, htmlContent]
    );

    // Marcar el proyecto como finalizado tipo operador con snapshot
    await pool.query(
      `UPDATE projects SET estado='finalized', project_type='operador', snapshot_finalizado=TRUE, updated_at=NOW(3) WHERE project_id=?`,
      [projectId]
    );

    res.json({ success: true, message: 'Proyecto finalizado como operador exitosamente' });
  } catch (e: any) {
    console.error('Error finalizando proyecto como operador:', e);
    res.status(500).json({ error: 'Error al finalizar proyecto: ' + e.message });
  }
});

// POST /v1/projects/:id/finalize - Finalizar proyecto y guardar snapshot HTML (inversión completa)
router.post('/v1/projects/:id/finalize', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const project = projectRows[0];

  // Verificar que el proyecto esté en estado 'finalized'
  if (project.estado !== 'finalized') {
    return res.status(400).json({ error: 'El proyecto debe estar en estado finalized para poder finalizarse definitivamente' });
  }

  // Validar que tenga HTML content
  const htmlContent = req.body.htmlContent;
  if (!htmlContent || typeof htmlContent !== 'string') {
    return res.status(400).json({ error: 'Se requiere htmlContent en el body' });
  }

  try {
    // Guardar o actualizar el snapshot HTML
    await pool.query(
      `INSERT INTO project_snapshots (project_id, html_content, finalized_at)
       VALUES (?, ?, NOW(3))
       ON DUPLICATE KEY UPDATE html_content=VALUES(html_content), finalized_at=NOW(3)`,
      [projectId, htmlContent]
    );

    // Marcar el proyecto como snapshot_finalizado y tipo inversión
    await pool.query(
      `UPDATE projects SET snapshot_finalizado=TRUE, project_type='inversión', updated_at=NOW(3) WHERE project_id=?`,
      [projectId]
    );

    res.json({ success: true, message: 'Proyecto finalizado exitosamente' });
  } catch (e: any) {
    console.error('Error finalizando proyecto:', e);
    res.status(500).json({ error: 'Error al finalizar proyecto: ' + e.message });
  }
});

// GET /v1/projects/:id/snapshot - Obtener snapshot HTML del proyecto finalizado
router.get('/v1/projects/:id/snapshot', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  // Verificar que el usuario es dueño del proyecto
  const [projectRows] = await pool.query<any[]>(
    `SELECT snapshot_finalizado FROM projects WHERE project_id=? AND owner_email=?`,
    [projectId, email]
  );
  if (!projectRows || projectRows.length === 0) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const project = projectRows[0];

  // Verificar que el proyecto tenga snapshot
  if (!project.snapshot_finalizado) {
    return res.status(404).json({ error: 'El proyecto no tiene snapshot finalizado' });
  }

  // Obtener el snapshot
  const [snapshotRows] = await pool.query<any[]>(
    `SELECT html_content, finalized_at FROM project_snapshots WHERE project_id=?`,
    [projectId]
  );

  if (!snapshotRows || snapshotRows.length === 0) {
    return res.status(404).json({ error: 'Snapshot no encontrado' });
  }

  const snapshot = snapshotRows[0];
  res.json({
    htmlContent: snapshot.html_content,
    finalizedAt: snapshot.finalized_at
  });
});

// GET /v1/projects/:id/operador-data - Obtener datos para documento Word de operador
router.get('/v1/projects/:id/operador-data', async (req, res) => {
  const email = (req as any).userEmail as string;
  const projectId = req.params.id;

  try {
    // Verificar que el usuario es dueño del proyecto
    const [projectRows] = await pool.query<any[]>(
      `SELECT * FROM projects WHERE project_id=? AND owner_email=?`,
      [projectId, email]
    );
    if (!projectRows || projectRows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const project = projectRows[0];

    // Verificar que sea un proyecto de operador
    if (project.project_type !== 'operador') {
      return res.status(400).json({ error: 'Este endpoint es solo para proyectos de tipo operador' });
    }

    // Obtener datos del proyecto
    const [[settings]]: any = await pool.query(
      `SELECT * FROM project_settings WHERE project_id=?`,
      [projectId]
    );

    const [[operator]]: any = await pool.query(
      `SELECT * FROM operator_contracts WHERE project_id=?`,
      [projectId]
    );

    // Obtener USALI anual
    const [annuals]: any = await pool.query(
      `SELECT anio, rn, rooms_rev, fb, other_operated, misc_income, occupancy, adr,
              operating_revenue, dept_total, dept_profit, und_total, gop, fees,
              nonop, ebitda, ffe, ebitda_less_ffe,
              gop_margin, ebitda_margin, ebitda_less_ffe_margin
       FROM usali_annual
       WHERE project_id=?
       ORDER BY anio`,
      [projectId]
    );

    if (!annuals || annuals.length === 0) {
      return res.status(404).json({ error: 'No se encontraron datos de USALI' });
    }

    // Calcular totales
    const totals = annuals.reduce((acc: any, year: any) => ({
      operating_revenue: acc.operating_revenue + (year.operating_revenue || 0),
      gop: acc.gop + (year.gop || 0),
      fees: acc.fees + (year.fees || 0),
      ebitda: acc.ebitda + (year.ebitda || 0),
      rn: acc.rn + (year.rn || 0),
    }), {
      operating_revenue: 0,
      gop: 0,
      fees: 0,
      ebitda: 0,
      rn: 0,
    });

    res.json({
      project: {
        nombre: project.nombre,
        comunidad_autonoma: project.comunidad_autonoma,
        provincia: project.provincia,
        zona: project.zona,
        segmento: project.segmento,
        categoria: project.categoria,
        habitaciones: project.habitaciones,
        horizonte: project.horizonte,
      },
      operator: {
        operacion_tipo: operator?.operacion_tipo || 'operador',
        fee_base_anual: operator?.fee_base_anual || 0,
        fee_pct_total_rev: operator?.fee_pct_total_rev || 0,
        fee_pct_gop: operator?.fee_pct_gop || 0,
        fee_incentive_pct: operator?.fee_incentive_pct || 0,
        fee_hurdle_gop_margin: operator?.fee_hurdle_gop_margin || 0,
      },
      settings: {
        ffe: settings?.ffe || 0,
      },
      annuals,
      totals,
    });
  } catch (e: any) {
    console.error('Error obteniendo datos de operador:', e);
    res.status(500).json({ error: 'Error al obtener datos: ' + e.message });
  }
});

export default router;
