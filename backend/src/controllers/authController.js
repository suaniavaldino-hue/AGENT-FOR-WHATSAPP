import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, mapUser } from '../config/db.js';
import { createAuditLog } from '../utils/audit.js';
import { isValidBrazilWhatsApp, isValidCPF, normalizeBrazilWhatsApp, ROLES, WORKPLACES } from '../utils/validators.js';

function signToken(id) {
  return jwt.sign({ id: String(id) }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function validateUserPayload(payload, isGoogle = false) {
  const required = ['name', 'surname', 'email', 'cpf', 'whatsapp', 'workplace'];
  for (const field of required) {
    if (!String(payload[field] || '').trim()) throw new Error(`Campo obrigatório: ${field}`);
  }
  if (!isGoogle && !String(payload.password || '').trim()) throw new Error('Senha obrigatória');
  if (!isValidCPF(payload.cpf)) throw new Error('CPF inválido');
  if (!isValidBrazilWhatsApp(payload.whatsapp)) throw new Error('WhatsApp inválido com DDD');
  if (!WORKPLACES.includes(payload.workplace)) throw new Error('Empresa inválida');
  if (payload.role && !ROLES.includes(payload.role)) throw new Error('Cargo inválido');
}

export async function register(req, res) {
  try {
    const { name, surname, email, password, role = 'usuario', cpf, whatsapp, workplace, position = 'Usuário' } = req.body;
    validateUserPayload({ name, surname, email, password, cpf, whatsapp, workplace, role });
    const db = getDb();
    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ message: 'E-mail já cadastrado' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.run(
      `INSERT INTO users (name, surname, email, password, role, position, cpf, whatsapp, workplace, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [name, surname, email.toLowerCase(), hashed, role, position, cpf.replace(/\D/g, ''), normalizeBrazilWhatsApp(whatsapp), workplace]
    );
    const row = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const user = mapUser(row);
    await createAuditLog({ entityType: 'user', entityId: user.id, action: 'create', changedByUserId: user.id, changedByName: user.fullName, details: { role } });
    return res.status(201).json({ user, token: signToken(user.id) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const db = getDb();
    const row = await db.get('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]);
    if (!row) return res.status(400).json({ message: 'Credenciais inválidas' });
    const isValid = await bcrypt.compare(password, row.password);
    if (!isValid) return res.status(400).json({ message: 'Credenciais inválidas' });
    const user = mapUser(row);
    return res.json({ user, token: signToken(user.id) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function googleAuth(req, res) {
  try {
    const { email, name, surname, cpf, whatsapp, workplace, googleId = '', position = 'Usuário' } = req.body;
    validateUserPayload({ name, surname, email, cpf, whatsapp, workplace }, true);
    const db = getDb();
    let row = await db.get('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]);
    if (!row) {
      const password = await bcrypt.hash(`google:${googleId || email}`, 10);
      const result = await db.run(
        `INSERT INTO users (name, surname, email, password, role, position, cpf, whatsapp, workplace, isGoogleUser, googleId, updatedAt)
         VALUES (?, ?, ?, ?, 'usuario', ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
        [name, surname, String(email).toLowerCase(), password, position, cpf.replace(/\D/g, ''), normalizeBrazilWhatsApp(whatsapp), workplace, googleId]
      );
      row = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    }
    const user = mapUser(row);
    return res.json({ user, token: signToken(user.id), provider: 'google-prepared' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function me(req, res) {
  return res.json(req.user);
}
