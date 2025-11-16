import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const createProjectSchema = z.object({
  rol: z.enum(['inversor','operador','banco']),
  nombre: z.string().min(2),
  ubicacion: z.string().min(2),
  segmento: z.enum(['urbano','vacacional']),
  categoria: z.enum(['economy','midscale','upper_midscale','upscale','upper_upscale','luxury']),
  habitaciones: z.number().int().positive(),
  horizonte: z.number().int().min(1).max(40).default(7),
  moneda: z.string().length(3).default('EUR')
});

router.get('/v1/projects', async (req, res) => {
  const email = (req as any).userEmail as string;
  const [rows] = await pool.query(
    `SELECT project_id, nombre, rol, ubicacion, segmento, categoria, horizonte, estado, updated_at
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
    `INSERT INTO projects (project_id, owner_email, rol, nombre, ubicacion, segmento, categoria, habitaciones, horizonte, moneda)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, email, p.rol, p.nombre, p.ubicacion, p.segmento, p.categoria, p.habitaciones, p.horizonte, p.moneda]
  );

  // defaults mínimos
  await pool.query(`INSERT INTO project_settings (project_id) VALUES (?)`, [id]);
  await pool.query(`INSERT INTO nonoperating_assumptions (project_id) VALUES (?)`, [id]);
  await pool.query(`INSERT INTO operator_contracts (project_id, operacion_tipo) VALUES (?, 'gestion_propia')`, [id]);

  res.status(201).json({ project_id: id });
});

export default router;
