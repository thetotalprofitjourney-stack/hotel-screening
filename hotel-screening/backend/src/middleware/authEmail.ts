import { Request, Response, NextFunction } from 'express';
import { pool } from '../db.js';

/**
 * Leemos el email del usuario autenticado (Kajabi) desde el header `x-user-email`.
 * En prod, reemplaza por tu middleware real de auth.
 *
 * IMPORTANTE: Este middleware también se asegura de que el usuario exista en la tabla `users`.
 * Si el usuario no existe, lo crea automáticamente.
 */
export async function requireEmail(req: Request, res: Response, next: NextFunction) {
  const email = req.header('x-user-email');
  if (!email) return res.status(401).json({ error: 'Missing x-user-email' });

  const normalizedEmail = email.toLowerCase();

  try {
    // Intentar crear el usuario si no existe (usando INSERT IGNORE)
    // Esto garantiza que el usuario exista antes de cualquier operación
    await pool.query(
      `INSERT IGNORE INTO users (email) VALUES (?)`,
      [normalizedEmail]
    );

    (req as any).userEmail = normalizedEmail;
    next();
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return res.status(500).json({ error: 'Error al verificar/crear usuario' });
  }
}
