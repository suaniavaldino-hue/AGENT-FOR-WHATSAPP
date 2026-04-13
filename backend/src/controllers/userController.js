import bcrypt from 'bcryptjs';
import { getDb, mapUser } from '../config/db.js';
import { createAuditLog, createDiffAuditLogs } from '../utils/audit.js';
import { isValidBrazilWhatsApp, isValidCPF, normalizeBrazilWhatsApp, ROLES, WORKPLACES } from '../utils/validators.js';

function ensurePayload(body, current = null) {
  const payload = {
    name: body.name ?? current?.name,
    surname: body.surname ?? current?.surname,
    email: String(body.email ?? current?.email ?? '').toLowerCase(),
    role: body.role ?? current?.role ?? 'usuario',
    position: body.position ?? current?.position ?? 'Usuário',
    cpf: body.cpf ?? current?.cpf,
    whatsapp: body.whatsapp ?? current?.whatsapp,
    workplace: body.workplace ?? current?.workplace,
    isFinanceiro: body.isFinanceiro ?? current?.isFinanceiro ?? 0
  };
  if (!payload.name || !payload.surname || !payload.email) throw new Error('Nome, sobrenome e e-mail são obrigatórios');
  if (!isValidCPF(payload.cpf)) throw new Error('CPF inválido');
  if (!isValidBrazilWhatsApp(payload.whatsapp)) throw new Error('WhatsApp inválido');
  if (!WORKPLACES.includes(payload.workplace)) throw new Error('Empresa inválida');
  if (!ROLES.includes(payload.role)) throw new Error('Perfil inválido');
  payload.cpf = String(payload.cpf).replace(/\D/g, '');
  payload.whatsapp = normalizeBrazilWhatsApp(payload.whatsapp);
  payload.isFinanceiro = payload.isFinanceiro ? 1 : 0;
  return payload;
}

export async function listUsers(_, res) {
  const rows = await getDb().all('SELECT * FROM users ORDER BY datetime(createdAt) DESC');
  res.json(rows.map(mapUser));
}

export async function createUser(req, res) {
  try {
    const db = getDb();
    const payload = ensurePayload(req.body);
    const exists = await db.get('SELECT id FROM users WHERE email = ?', [payload.email]);
    if (exists) return res.status(400).json({ message: 'E-mail já cadastrado' });
    const password = await bcrypt.hash(req.body.password || '123456', 10);
    const result = await db.run(
      `INSERT INTO users (name, surname, email, password, role, position, cpf, whatsapp, workplace, isFinanceiro, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [payload.name, payload.surname, payload.email, password, payload.role, payload.position, payload.cpf, payload.whatsapp, payload.workplace, payload.isFinanceiro]
    );
    const row = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const user = mapUser(row);
    await createAuditLog({ entityType: 'user', entityId: user.id, action: 'create', changedByUserId: req.user.id, changedByName: req.user.fullName, details: user });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateUser(req, res) {
  try {
    const db = getDb();
    const current = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ message: 'Usuário não encontrado' });
    const payload = ensurePayload(req.body, current);
    let password = current.password;
    if (req.body.password) password = await bcrypt.hash(req.body.password, 10);
    await db.run(
      `UPDATE users SET name=?, surname=?, email=?, password=?, role=?, position=?, cpf=?, whatsapp=?, workplace=?, isFinanceiro=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?`,
      [payload.name, payload.surname, payload.email, password, payload.role, payload.position, payload.cpf, payload.whatsapp, payload.workplace, payload.isFinanceiro, req.params.id]
    );
    const row = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const user = mapUser(row);
    await createDiffAuditLogs({ entityType: 'user', entityId: user.id, before: mapUser(current), after: user, changedBy: req.user });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
