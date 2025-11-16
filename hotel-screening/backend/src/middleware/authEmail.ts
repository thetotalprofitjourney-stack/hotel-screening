import { Request, Response, NextFunction } from 'express';

/**
 * Leemos el email del usuario autenticado (Kajabi) desde el header `x-user-email`.
 * En prod, reemplaza por tu middleware real de auth.
 */
export function requireEmail(req: Request, res: Response, next: NextFunction) {
  const email = req.header('x-user-email');
  if (!email) return res.status(401).json({ error: 'Missing x-user-email' });
  (req as any).userEmail = email.toLowerCase();
  next();
}
