import { getDb, mapAuditLog } from '../config/db.js';

export async function listAuditLogs(req, res) {
  const db = getDb();
  const { entityType = '', entityId = '' } = req.query;
  const where = [];
  const params = [];
  if (entityType) { where.push('entityType = ?'); params.push(entityType); }
  if (entityId) { where.push('entityId = ?'); params.push(String(entityId)); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await db.all(`SELECT * FROM audit_logs ${clause} ORDER BY createdAt DESC, id DESC LIMIT 200`, params);
  res.json(rows.map(mapAuditLog));
}
