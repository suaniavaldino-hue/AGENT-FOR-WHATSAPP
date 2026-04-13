import jwt from 'jsonwebtoken';
import { getDb, mapUser } from '../config/db.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Não autorizado' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const row = await getDb().get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!row) return res.status(401).json({ message: 'Usuário não encontrado' });
    req.user = mapUser(row);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito à administração' });
  }
  return next();
}
