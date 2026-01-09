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
  const kajabiUserId = req.header('x-kajabi-user-id');

  try {
    // Crear o actualizar el usuario con su kajabi_user_id si viene en el header
    // Si el usuario ya existe, actualizar solo el kajabi_user_id si viene en el header
    if (kajabiUserId) {
      await pool.query(
        `INSERT INTO users (email, kajabi_user_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE kajabi_user_id = VALUES(kajabi_user_id)`,
        [normalizedEmail, kajabiUserId]
      );
    } else {
      // Si no hay kajabi_user_id, solo crear el usuario si no existe
      await pool.query(
        `INSERT IGNORE INTO users (email) VALUES (?)`,
        [normalizedEmail]
      );
    }

    (req as any).userEmail = normalizedEmail;
    next();
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return res.status(500).json({ error: 'Error al verificar/crear usuario' });
  }
}
