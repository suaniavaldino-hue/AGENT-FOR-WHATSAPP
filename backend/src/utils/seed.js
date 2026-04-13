import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, getDb, resetDatabase } from '../config/db.js';

await connectDB(process.env.DATABASE_URL);
await resetDatabase();
const db = getDb();

const password = await bcrypt.hash('casa429', 10);
const admin = await db.run(
  `INSERT INTO users (name, surname, email, password, role, position, cpf, whatsapp, workplace, isFinanceiro, updatedAt)
   VALUES (?, ?, ?, ?, 'admin', 'Administrador', ?, ?, 'SpicyMidia', 1, CURRENT_TIMESTAMP)`,
  ['Rafael', 'Bruce', 'rafaelbruceblog@gmail.com', password, '11144477735', '5511999999999']
);

const atendimento = await db.run(
  `INSERT INTO users (name, surname, email, password, role, position, cpf, whatsapp, workplace, updatedAt)
   VALUES (?, ?, ?, ?, 'funcionario', 'Atendimento', ?, ?, 'GRAFFITI BAR KARAOKE', CURRENT_TIMESTAMP)`,
  ['Ana', 'Lima', 'ana@graffitibar.com', await bcrypt.hash('123456', 10), '39053344705', '5511988887777']
);

const contact1 = await db.run(
  `INSERT INTO contacts (name, phone, email, status, tags, notes, assignedTo, lastMessageAt, updatedAt)
   VALUES (?, ?, ?, 'novo_lead', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ['Carlos Silva', '5511977776666', 'carlos@email.com', JSON.stringify(['quente', 'karaoke']), 'Quer fechar pacote ainda hoje.', atendimento.lastID]
);

const contact2 = await db.run(
  `INSERT INTO contacts (name, phone, email, status, tags, notes, assignedTo, lastMessageAt, updatedAt)
   VALUES (?, ?, ?, 'proposta', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ['Marina Souza', '5511966665555', 'marina@email.com', JSON.stringify(['spicymidia', 'site']), 'Aguardando aprovação do site.', admin.lastID]
);

await db.run(
  `INSERT INTO messages (contactId, senderType, senderUserId, text, direction, status, type, meta, updatedAt)
   VALUES (?, 'agent', ?, ?, 'outbound', 'sent', 'text', ?, CURRENT_TIMESTAMP)`,
  [contact1.lastID, atendimento.lastID, 'Olá! Sou Ana Lima, do atendimento. Como posso ajudar?', JSON.stringify({ senderRole: 'funcionario', senderPosition: 'Atendimento' })]
);

await db.run(
  `INSERT INTO messages (contactId, senderType, senderUserId, text, direction, status, type, meta, updatedAt)
   VALUES (?, 'contact', NULL, ?, 'inbound', 'delivered', 'text', '{}', CURRENT_TIMESTAMP)`,
  [contact2.lastID, 'Quero saber como funciona o plano mensal.']
);

await db.run(
  `INSERT INTO automations (name, trigger, keyword, isActive, sortOrder, nodes, updatedAt)
   VALUES (?, 'keyword', ?, 1, 1, ?, CURRENT_TIMESTAMP)`,
  ['Boas-vindas PRO', 'oi', JSON.stringify([
    { id: '1', type: 'text', content: 'Olá! Bem-vindo ao atendimento oficial. Escolha uma opção abaixo.' },
    { id: '2', type: 'single_choice', question: 'Escolha uma opção: 1) Planos 2) Suporte 3) Financeiro', options: ['Planos', 'Suporte', 'Financeiro'] },
    { id: '3', type: 'payment', title: 'Sinal de reserva', amount: 50, pixKey: 'financeiro@spicymidia.com' }
  ])]
);

await db.run(
  `INSERT INTO whatsapp_connections (userId, connectionName, mode, status, phoneNumber, qrCode, pairingCode, accessCode, accessCodeExpiresAt, webhookUrl, connectedAt, notes, updatedAt)
   VALUES (?, 'Conta Principal', 'cloud_api', 'conectado', '5511999999999', '', '', '', '', 'https://example.com/api/messages/webhook', CURRENT_TIMESTAMP, 'Conexão principal pronta para webhook oficial.', CURRENT_TIMESTAMP)`,
  [admin.lastID]
);

console.log('Seed concluído com sucesso.');
process.exit(0);
