
import { getDb, mapAutomation } from '../config/db.js';
import { createAuditLog } from '../utils/audit.js';

export async function listAutomations(req, res) {
  const rows = await getDb().all('SELECT * FROM automations ORDER BY sortOrder ASC, id ASC');
  res.json(rows.map(mapAutomation));
}

export async function createAutomation(req, res) {
  try {
    const { name, trigger = 'keyword', keyword = '', isActive = true, nodes = [] } = req.body;
    const { nextOrder = 1 } = await getDb().get('SELECT COALESCE(MAX(sortOrder), 0) + 1 AS nextOrder FROM automations');
    const result = await getDb().run(
      `INSERT INTO automations (name, trigger, keyword, isActive, sortOrder, nodes, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [name, trigger, keyword, isActive ? 1 : 0, nextOrder, JSON.stringify(nodes)]
    );
    const row = await getDb().get('SELECT * FROM automations WHERE id = ?', [result.lastID]);
    await createAuditLog({ entityType: 'automation', entityId: result.lastID, action: 'create', changedByUserId: req.user.id, changedByName: req.user.fullName, details: row });
    res.status(201).json(mapAutomation(row));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateAutomation(req, res) {
  try {
    const current = await getDb().get('SELECT * FROM automations WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ message: 'Fluxo não encontrado' });
    const payload = {
      name: req.body.name ?? current.name,
      trigger: req.body.trigger ?? current.trigger,
      keyword: req.body.keyword ?? current.keyword,
      isActive: req.body.isActive ?? Boolean(current.isActive),
      sortOrder: req.body.sortOrder ?? current.sortOrder,
      nodes: req.body.nodes ?? JSON.parse(current.nodes || '[]')
    };
    await getDb().run(
      `UPDATE automations SET name=?, trigger=?, keyword=?, isActive=?, sortOrder=?, nodes=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?`,
      [payload.name, payload.trigger, payload.keyword, payload.isActive ? 1 : 0, payload.sortOrder, JSON.stringify(payload.nodes), req.params.id]
    );
    const row = await getDb().get('SELECT * FROM automations WHERE id = ?', [req.params.id]);
    await createAuditLog({ entityType: 'automation', entityId: req.params.id, action: 'update', changedByUserId: req.user.id, changedByName: req.user.fullName, details: payload });
    res.json(mapAutomation(row));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function reorderAutomations(req, res) {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const db = getDb();
    await db.exec('BEGIN TRANSACTION');
    try {
      for (let index = 0; index < items.length; index += 1) {
        const id = Number(items[index].id || items[index]._id);
        await db.run('UPDATE automations SET sortOrder = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [index + 1, id]);
      }
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
    const rows = await db.all('SELECT * FROM automations ORDER BY sortOrder ASC, id ASC');
    await createAuditLog({ entityType: 'automation', entityId: 'all', action: 'reorder', changedByUserId: req.user.id, changedByName: req.user.fullName, details: { ids: items.map((item) => item.id || item._id) } });
    res.json(rows.map(mapAutomation));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteAutomation(req, res) {
  const current = await getDb().get('SELECT * FROM automations WHERE id = ?', [req.params.id]);
  if (!current) return res.status(404).json({ message: 'Fluxo não encontrado' });
  await getDb().run('DELETE FROM automations WHERE id = ?', [req.params.id]);
  const rows = await getDb().all('SELECT id FROM automations ORDER BY sortOrder ASC, id ASC');
  for (let index = 0; index < rows.length; index += 1) {
    await getDb().run('UPDATE automations SET sortOrder = ? WHERE id = ?', [index + 1, rows[index].id]);
  }
  await createAuditLog({ entityType: 'automation', entityId: req.params.id, action: 'delete', changedByUserId: req.user.id, changedByName: req.user.fullName, details: current });
  res.json({ ok: true });
}
