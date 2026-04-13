import { getDb, mapContact, mapMessage } from '../config/db.js';
import { createAuditLog, createDiffAuditLogs } from '../utils/audit.js';

const contactSelect = `
  SELECT
    c.*,
    u.id AS assignedToId,
    u.name AS assignedToName,
    u.surname AS assignedToSurname,
    u.email AS assignedToEmail,
    u.role AS assignedToRole,
    u.position AS assignedToPosition
  FROM contacts c
  LEFT JOIN users u ON u.id = c.assignedTo
`;

export async function listContacts(req, res) {
  const db = getDb();
  let sql = `${contactSelect}`;
  const params = [];
  if (req.user.role !== 'admin') {
    sql += ' WHERE c.assignedTo IS NULL OR c.assignedTo = ?';
    params.push(Number(req.user.id));
  }
  sql += ' ORDER BY datetime(c.lastMessageAt) DESC';
  const rows = await db.all(sql, params);
  res.json(rows.map(mapContact));
}

export async function createContact(req, res) {
  try {
    const db = getDb();
    const { name, phone, email = '', status = 'novo_lead', tags = [], notes = '', assignedTo = null } = req.body;
    const result = await db.run(
      `INSERT INTO contacts (name, phone, email, status, tags, notes, assignedTo, lastMessageAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, phone, email, status, JSON.stringify(tags), notes, assignedTo ? Number(assignedTo) : null]
    );
    const row = await db.get(`${contactSelect} WHERE c.id = ?`, [result.lastID]);
    await createAuditLog({ entityType: 'contact', entityId: result.lastID, action: 'create', changedByUserId: req.user.id, changedByName: req.user.fullName, details: row });
    res.status(201).json(mapContact(row));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateContact(req, res) {
  try {
    const db = getDb();
    const current = await db.get('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ message: 'Contato não encontrado' });
    const payload = {
      name: req.body.name ?? current.name,
      phone: req.body.phone ?? current.phone,
      email: req.body.email ?? current.email,
      status: req.body.status ?? current.status,
      tags: req.body.tags ?? JSON.parse(current.tags || '[]'),
      notes: req.body.notes ?? current.notes,
      assignedTo: req.body.assignedTo !== undefined ? req.body.assignedTo : current.assignedTo,
      lastMessageAt: req.body.lastMessageAt ?? current.lastMessageAt
    };
    await db.run(
      `UPDATE contacts SET name=?, phone=?, email=?, status=?, tags=?, notes=?, assignedTo=?, lastMessageAt=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?`,
      [payload.name, payload.phone, payload.email, payload.status, JSON.stringify(payload.tags), payload.notes, payload.assignedTo ? Number(payload.assignedTo) : null, payload.lastMessageAt, req.params.id]
    );
    const row = await db.get(`${contactSelect} WHERE c.id = ?`, [req.params.id]);
    const mapped = mapContact(row);
    await createDiffAuditLogs({ entityType: 'contact', entityId: req.params.id, before: { ...current, tags: JSON.parse(current.tags || '[]') }, after: mapped, changedBy: req.user });
    res.json(mapped);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function getConversation(req, res) {
  const rows = await getDb().all(
    `SELECT m.*, u.name || ' ' || u.surname AS senderUserName, u.role AS senderUserRole, u.position AS senderUserPosition
     FROM messages m
     LEFT JOIN users u ON u.id = m.senderUserId
     WHERE m.contactId = ?
     ORDER BY datetime(m.createdAt) ASC, m.id ASC`,
    [req.params.id]
  );
  res.json(rows.map(mapMessage));
}
