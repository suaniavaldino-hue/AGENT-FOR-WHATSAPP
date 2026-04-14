
import { getDb, mapAutomation, mapContact, mapMessage } from '../config/db.js';
import { sendWhatsAppText } from '../services/whatsappService.js';
import { getSocket } from '../services/socket.js';
import { createAuditLog } from '../utils/audit.js';

async function findContactById(contactId) {
  const row = await getDb().get(
    `SELECT c.*, u.id AS assignedToId, u.name AS assignedToName, u.surname AS assignedToSurname, u.email AS assignedToEmail, u.role AS assignedToRole, u.position AS assignedToPosition
     FROM contacts c
     LEFT JOIN users u ON u.id = c.assignedTo
     WHERE c.id = ?`,
    [contactId]
  );
  return mapContact(row);
}

async function getConversationRows(contactId) {
  return getDb().all(
    `SELECT m.*, u.name || ' ' || u.surname AS senderUserName, u.role AS senderUserRole, u.position AS senderUserPosition
     FROM messages m
     LEFT JOIN users u ON u.id = m.senderUserId
     WHERE m.contactId = ? ORDER BY m.createdAt ASC, m.id ASC`,
    [contactId]
  );
}

async function emitConversation(contactId) {
  const io = getSocket();
  if (!io) return;
  const rows = await getConversationRows(contactId);
  io.emit('conversation:update', { contactId: String(contactId), messages: rows.map(mapMessage) });
}

async function insertMessage({ contactId, senderType, senderUserId = null, text = '', direction, status = 'sent', type = 'text', meta = {} }) {
  const result = await getDb().run(
    `INSERT INTO messages (contactId, senderType, senderUserId, text, direction, status, type, meta, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [Number(contactId), senderType, senderUserId ? Number(senderUserId) : null, text, direction, status, type, JSON.stringify(meta)]
  );
  return getDb().get('SELECT * FROM messages WHERE id = ?', [result.lastID]);
}

function getNodeText(node) {
  return node.content || node.url || node.question || node.title || '';
}

async function handlePaymentNode(contact, node) {
  const financeUser = await getDb().get('SELECT * FROM users WHERE isFinanceiro = 1 ORDER BY id ASC LIMIT 1');
  const checkoutLink = node.checkoutLink || `pix://checkout/${contact.id}/${Date.now()}`;
  const pixQrCode = node.pixQrCode || '00020126360014BR.GOV.BCB.PIX0114chavepix@demo5204000053039865406100.005802BR5920SpicyMidia Demo6009Sao Paulo62070503***6304ABCD';
  const result = await getDb().run(
    `INSERT INTO payment_requests (contactId, title, amount, pixKey, pixQrCode, checkoutLink, assignedFinanceUserId, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [Number(contact.id), node.title || 'Pagamento', Number(node.amount || 0), node.pixKey || 'chavepix@demo', pixQrCode, checkoutLink, financeUser?.id || null]
  );

  const text = `${node.title || 'Pagamento'}\nValor: R$ ${Number(node.amount || 0).toFixed(2)}\nPIX: ${node.pixKey || 'chavepix@demo'}\nCheckout: ${checkoutLink}`;
  await insertMessage({ contactId: contact.id, senderType: 'bot', text, direction: 'outbound', type: 'payment', meta: { paymentRequestId: result.lastID, pixQrCode, checkoutLink } });
  await sendWhatsAppText(contact.phone, text);
  if (financeUser) {
    await createAuditLog({
      entityType: 'payment_request',
      entityId: result.lastID,
      action: 'create',
      changedByUserId: financeUser.id,
      changedByName: financeUser.name,
      details: { contactId: contact.id, financeUserId: financeUser.id }
    });
  }
}

async function executeAutomation(contact, incomingText) {
  const rows = await getDb().all('SELECT * FROM automations WHERE isActive = 1 ORDER BY sortOrder ASC, id ASC');
  const automations = rows.map(mapAutomation);
  const matched = automations.find((item) => item.trigger === 'keyword' && item.keyword && incomingText.toLowerCase().includes(item.keyword.toLowerCase()));
  if (!matched) return;

  for (const node of matched.nodes) {
    const type = node.type || 'text';
    if (['text', 'image', 'video', 'audio', 'link', 'single_choice'].includes(type)) {
      const text = getNodeText(node);
      await insertMessage({ contactId: contact.id, senderType: 'bot', text, direction: 'outbound', type, meta: node });
      await sendWhatsAppText(contact.phone, text);
    }
    if (type === 'payment') {
      await handlePaymentNode(contact, node);
    }
  }
  await getDb().run('UPDATE contacts SET lastMessageAt=CURRENT_TIMESTAMP, updatedAt=CURRENT_TIMESTAMP WHERE id=?', [Number(contact.id)]);
  await emitConversation(contact.id);
}

export async function sendMessage(req, res) {
  try {
    const { contactId, text = '', type = 'text', meta = {} } = req.body;
    const contact = await findContactById(contactId);
    if (!contact) return res.status(404).json({ message: 'Contato não encontrado' });

    const normalizedText = text || meta?.url || meta?.question || 'Mensagem enviada';
    await sendWhatsAppText(contact.phone, normalizedText);
    const row = await insertMessage({
      contactId,
      senderType: 'agent',
      senderUserId: req.user.id,
      text: normalizedText,
      direction: 'outbound',
      type,
      meta: { ...meta, senderName: req.user.fullName, senderRole: req.user.role, senderPosition: req.user.position }
    });
    await getDb().run('UPDATE contacts SET lastMessageAt=CURRENT_TIMESTAMP, updatedAt=CURRENT_TIMESTAMP WHERE id=?', [Number(contactId)]);
    await emitConversation(contactId);
    return res.status(201).json(mapMessage(row));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function confirmPayment(req, res) {
  try {
    const { paymentRequestId, receiptUrl = '', approved = true } = req.body;
    const payment = await getDb().get('SELECT * FROM payment_requests WHERE id = ?', [paymentRequestId]);
    if (!payment) return res.status(404).json({ message: 'Pagamento não encontrado' });
    await getDb().run('UPDATE payment_requests SET status=?, receiptUrl=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?', [approved ? 'paid' : 'rejected', receiptUrl, paymentRequestId]);
    const finance = payment.assignedFinanceUserId ? await getDb().get('SELECT * FROM users WHERE id = ?', [payment.assignedFinanceUserId]) : null;
    if (finance) {
      await createAuditLog({
        entityType: 'payment_request',
        entityId: paymentRequestId,
        action: approved ? 'paid' : 'rejected',
        changedByUserId: req.user.id,
        changedByName: req.user.fullName,
        details: { receiptUrl, financeEmail: finance.email }
      });
    }
    await insertMessage({ contactId: payment.contactId, senderType: 'system', text: approved ? 'Pagamento confirmado.' : 'Pagamento recusado.', direction: 'outbound', type: 'payment_status', meta: { paymentRequestId, receiptUrl } });
    await emitConversation(payment.contactId);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function whatsappWebhookVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
}

export async function whatsappWebhookReceive(req, res) {
  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const incoming = entry?.messages?.[0];
    if (!incoming) return res.sendStatus(200);
    const phone = incoming.from;
    const text = incoming?.text?.body || '';
    let contactRow = await getDb().get('SELECT * FROM contacts WHERE phone = ?', [phone]);
    if (!contactRow) {
      const result = await getDb().run(
        `INSERT INTO contacts (name, phone, status, tags, notes, lastMessageAt, updatedAt) VALUES (?, ?, 'novo_lead', ?, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [`Lead ${phone}`, phone, JSON.stringify(['novo_lead'])]
      );
      contactRow = await getDb().get('SELECT * FROM contacts WHERE id = ?', [result.lastID]);
    }
    await insertMessage({ contactId: contactRow.id, senderType: 'contact', text, direction: 'inbound', status: 'delivered', type: incoming.type || 'text', meta: incoming });
    await getDb().run('UPDATE contacts SET lastMessageAt=CURRENT_TIMESTAMP, updatedAt=CURRENT_TIMESTAMP WHERE id=?', [contactRow.id]);
    const contact = await findContactById(contactRow.id);
    await emitConversation(contact.id);
    await executeAutomation(contact, text);
    return res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
}
