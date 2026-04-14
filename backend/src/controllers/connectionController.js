
import { getDb, mapConnection } from '../config/db.js';
import { createAuditLog } from '../utils/audit.js';
import { normalizeBrazilWhatsApp } from '../utils/validators.js';
import { sendWhatsAppText } from '../services/whatsappService.js';

const selectSql = `
  SELECT wc.*, u.name || ' ' || u.surname AS userName
  FROM whatsapp_connections wc
  JOIN users u ON u.id = wc.userId
`;

function buildMockQr(connectionName) {
  const text = encodeURIComponent(connectionName || 'Conexão WhatsApp');
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" rx="18" fill="#0f172a"/><text x="50%" y="46%" fill="#fff" font-size="14" text-anchor="middle">QR CODE</text><text x="50%" y="57%" fill="#94a3b8" font-size="11" text-anchor="middle">${text}</text></svg>`
  ).toString('base64')}`;
}

export async function listConnections(_, res) {
  const rows = await getDb().all(`${selectSql} ORDER BY wc.createdAt DESC, wc.id DESC`);
  res.json(rows.map(mapConnection));
}

export async function createConnection(req, res) {
  try {
    const { connectionName, mode, phoneNumber = '', userId, webhookUrl = '' } = req.body;
    const normalizedPhone = phoneNumber ? normalizeBrazilWhatsApp(phoneNumber) : '';
    const qrCode = mode === 'qr_code' ? buildMockQr(connectionName) : '';
    const pairingCode = mode === 'phone_number' ? String(Math.floor(100000 + Math.random() * 900000)) : '';
    const status = mode === 'cloud_api' ? 'conectado' : 'aguardando_confirmação';

    const result = await getDb().run(
      `INSERT INTO whatsapp_connections (userId, connectionName, mode, status, phoneNumber, qrCode, pairingCode, webhookUrl, notes, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [Number(userId || req.user.id), connectionName, mode, status, normalizedPhone, qrCode, pairingCode, webhookUrl, mode === 'cloud_api' ? 'Cloud API pronta para receber webhook.' : 'Conexão criada.']
    );
    const row = await getDb().get(`${selectSql} WHERE wc.id = ?`, [result.lastID]);
    await createAuditLog({ entityType: 'whatsapp_connection', entityId: result.lastID, action: 'create', changedByUserId: req.user.id, changedByName: req.user.fullName, details: row });
    res.status(201).json(mapConnection(row));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function requestAccessCode(req, res) {
  try {
    const { phoneNumber, connectionName = 'Conta WhatsApp' } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: 'Informe o número do WhatsApp com DDD.' });
    const normalizedPhone = normalizeBrazilWhatsApp(phoneNumber);
    const accessCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const result = await getDb().run(
      `INSERT INTO whatsapp_connections (userId, connectionName, mode, status, phoneNumber, pairingCode, accessCode, accessCodeExpiresAt, notes, updatedAt)
       VALUES (?, ?, 'phone_number', 'código_enviado', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [Number(req.user.id), connectionName, normalizedPhone, accessCode, accessCode, expiresAt, 'Código enviado para o número informado.']
    );

    const message = `Seu código de acesso do WhatsApp é: ${accessCode}. Ele vence em 10 minutos.`;
    const delivery = await sendWhatsAppText(normalizedPhone, message);

    const row = await getDb().get(`${selectSql} WHERE wc.id = ?`, [result.lastID]);
    await createAuditLog({
      entityType: 'whatsapp_connection',
      entityId: result.lastID,
      action: 'send_access_code',
      changedByUserId: req.user.id,
      changedByName: req.user.fullName,
      details: { phoneNumber: normalizedPhone, mocked: Boolean(delivery?.mocked) }
    });

    res.status(201).json({
      connection: mapConnection(row),
      codeSent: true,
      mocked: Boolean(delivery?.mocked),
      preview: delivery?.preview || null
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function confirmAccessCode(req, res) {
  try {
    const { phoneNumber, accessCode } = req.body;
    if (!phoneNumber || !accessCode) return res.status(400).json({ message: 'Informe número e código.' });

    const normalizedPhone = normalizeBrazilWhatsApp(phoneNumber);
    const row = await getDb().get(
      `${selectSql} WHERE wc.mode='phone_number' AND wc.phoneNumber = ? AND wc.accessCode = ? ORDER BY wc.id DESC LIMIT 1`,
      [normalizedPhone, String(accessCode)]
    );

    if (!row) return res.status(404).json({ message: 'Código não encontrado para este número.' });
    if (row.accessCodeExpiresAt && new Date(row.accessCodeExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Esse código expirou. Gere um novo código.' });
    }

    await getDb().run(
      `UPDATE whatsapp_connections
       SET status='conectado', connectedAt=CURRENT_TIMESTAMP, notes='Conectado por código de acesso.', updatedAt=CURRENT_TIMESTAMP
       WHERE id = ?`,
      [row.id]
    );

    const updated = await getDb().get(`${selectSql} WHERE wc.id = ?`, [row.id]);
    await createAuditLog({
      entityType: 'whatsapp_connection',
      entityId: row.id,
      action: 'confirm_access_code',
      changedByUserId: req.user.id,
      changedByName: req.user.fullName,
      details: { phoneNumber: normalizedPhone }
    });

    res.json(mapConnection(updated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
