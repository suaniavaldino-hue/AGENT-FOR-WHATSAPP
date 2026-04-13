import { getDb } from '../config/db.js';

export async function getDashboard(req, res) {
  const db = getDb();
  const [contactsRow, messagesRow, usersRow, automationsRow, pipelineRows, auditRow, financialUsers, connections] = await Promise.all([
    db.get('SELECT COUNT(*) AS total FROM contacts'),
    db.get('SELECT COUNT(*) AS total FROM messages'),
    db.get('SELECT COUNT(*) AS total FROM users'),
    db.get('SELECT COUNT(*) AS total FROM automations WHERE isActive = 1'),
    db.all('SELECT status AS _id, COUNT(*) AS total FROM contacts GROUP BY status ORDER BY total DESC'),
    db.get('SELECT COUNT(*) AS total FROM audit_logs'),
    db.get('SELECT COUNT(*) AS total FROM users WHERE isFinanceiro = 1'),
    db.get('SELECT COUNT(*) AS total FROM whatsapp_connections')
  ]);

  res.json({
    contacts: contactsRow.total,
    messages: messagesRow.total,
    agents: usersRow.total,
    automations: automationsRow.total,
    audits: auditRow.total,
    financialUsers: financialUsers.total,
    whatsappConnections: connections.total,
    pipeline: pipelineRows
  });
}
