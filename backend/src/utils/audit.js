import { getDb } from '../config/db.js';

export async function createAuditLog({ entityType, entityId, action, changedByUserId = null, changedByName = '', field = '', beforeValue = '', afterValue = '', details = {} }) {
  const db = getDb();
  await db.run(
    `INSERT INTO audit_logs (entityType, entityId, action, changedByUserId, changedByName, field, beforeValue, afterValue, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entityType, String(entityId), action, changedByUserId ? Number(changedByUserId) : null, changedByName, field, String(beforeValue ?? ''), String(afterValue ?? ''), JSON.stringify(details)]
  );
}

export async function createDiffAuditLogs({ entityType, entityId, before = {}, after = {}, changedBy }) {
  const keys = Object.keys(after);
  for (const key of keys) {
    const previous = JSON.stringify(before[key] ?? null);
    const next = JSON.stringify(after[key] ?? null);
    if (previous !== next) {
      await createAuditLog({
        entityType,
        entityId,
        action: 'update',
        changedByUserId: changedBy?.id,
        changedByName: changedBy?.fullName || changedBy?.name || 'Sistema',
        field: key,
        beforeValue: previous,
        afterValue: next,
        details: { key }
      });
    }
  }
}
