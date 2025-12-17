import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /v1/hierarchy/comunidades-autonomas - Obtener todas las comunidades autónomas disponibles
router.get('/v1/hierarchy/comunidades-autonomas', async (_req, res) => {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT DISTINCT comunidad_autonoma
       FROM occ_adr_benchmark_catalog
       WHERE comunidad_autonoma IS NOT NULL
       ORDER BY comunidad_autonoma`
    );

    const comunidades = rows.map(r => r.comunidad_autonoma);
    res.json(comunidades);
  } catch (error: any) {
    console.error('Error fetching comunidades autónomas:', error);
    res.status(500).json({ error: 'Error al obtener comunidades autónomas' });
  }
});

// GET /v1/hierarchy/provincias?ca=... - Obtener provincias de una comunidad autónoma
router.get('/v1/hierarchy/provincias', async (req, res) => {
  try {
    const ca = req.query.ca as string;

    if (!ca) {
      return res.status(400).json({ error: 'Se requiere el parámetro ca (comunidad_autonoma)' });
    }

    const [rows] = await pool.query<any[]>(
      `SELECT DISTINCT provincia
       FROM occ_adr_benchmark_catalog
       WHERE comunidad_autonoma = ? AND provincia IS NOT NULL
       ORDER BY provincia`,
      [ca]
    );

    const provincias = rows.map(r => r.provincia);
    res.json(provincias);
  } catch (error: any) {
    console.error('Error fetching provincias:', error);
    res.status(500).json({ error: 'Error al obtener provincias' });
  }
});

// GET /v1/hierarchy/zonas?ca=...&prov=... - Obtener zonas de una provincia y comunidad autónoma
router.get('/v1/hierarchy/zonas', async (req, res) => {
  try {
    const ca = req.query.ca as string;
    const prov = req.query.prov as string;

    if (!ca || !prov) {
      return res.status(400).json({ error: 'Se requieren los parámetros ca (comunidad_autonoma) y prov (provincia)' });
    }

    const [rows] = await pool.query<any[]>(
      `SELECT DISTINCT zona
       FROM occ_adr_benchmark_catalog
       WHERE comunidad_autonoma = ? AND provincia = ? AND zona IS NOT NULL
       ORDER BY zona`,
      [ca, prov]
    );

    const zonas = rows.map(r => r.zona);
    res.json(zonas);
  } catch (error: any) {
    console.error('Error fetching zonas:', error);
    res.status(500).json({ error: 'Error al obtener zonas' });
  }
});

// GET /v1/hierarchy/categorias - Obtener todas las categorías con sus labels
router.get('/v1/hierarchy/categorias', async (_req, res) => {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT category_code, display_label
       FROM category_catalog
       ORDER BY category_code`
    );

    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

export default router;
