import { Pool } from 'pg';

let pool;

function convertPlaceholders(sql = '') {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function normalizeSql(sql = '') {
  return sql
    .replace(/AUTOINCREMENT/gi, '')
    .replace(/INTEGER PRIMARY KEY/gi, 'BIGSERIAL PRIMARY KEY')
    .replace(/CURRENT_TIMESTAMP/gi, 'NOW()');
}

function convertRunResult(result) {
  return { lastID: result.rows?.[0]?.id ?? null, changes: result.rowCount ?? 0 };
}

function mapBooleanish(value) {
  return value === true || value === 1 || value === '1';
}

export async function connectDB(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  await pool.query('SELECT 1');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      surname TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'usuario',
      position TEXT NOT NULL DEFAULT 'Usuário',
      cpf TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      workplace TEXT NOT NULL DEFAULT 'SpicyMidia',
      isFinanceiro SMALLINT NOT NULL DEFAULT 0,
      isGoogleUser SMALLINT NOT NULL DEFAULT 0,
      googleId TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'novo_lead',
      tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      assignedTo BIGINT REFERENCES users(id) ON DELETE SET NULL,
      lastMessageAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      contactId BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      senderType TEXT NOT NULL,
      senderUserId BIGINT REFERENCES users(id) ON DELETE SET NULL,
      text TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text',
      direction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      meta TEXT NOT NULL DEFAULT '{}',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS automations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      trigger TEXT NOT NULL DEFAULT 'keyword',
      keyword TEXT NOT NULL DEFAULT '',
      isActive SMALLINT NOT NULL DEFAULT 1,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      nodes TEXT NOT NULL DEFAULT '[]',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      action TEXT NOT NULL,
      changedByUserId BIGINT REFERENCES users(id) ON DELETE SET NULL,
      changedByName TEXT NOT NULL DEFAULT '',
      field TEXT NOT NULL DEFAULT '',
      beforeValue TEXT NOT NULL DEFAULT '',
      afterValue TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '{}',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS whatsapp_connections (
      id BIGSERIAL PRIMARY KEY,
      userId BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connectionName TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'cloud_api',
      status TEXT NOT NULL DEFAULT 'pending',
      phoneNumber TEXT NOT NULL DEFAULT '',
      qrCode TEXT NOT NULL DEFAULT '',
      pairingCode TEXT NOT NULL DEFAULT '',
      accessCode TEXT NOT NULL DEFAULT '',
      accessCodeExpiresAt TEXT NOT NULL DEFAULT '',
      webhookUrl TEXT NOT NULL DEFAULT '',
      connectedAt TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id BIGSERIAL PRIMARY KEY,
      contactId BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      automationId BIGINT REFERENCES automations(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      pixKey TEXT NOT NULL DEFAULT '',
      pixQrCode TEXT NOT NULL DEFAULT '',
      checkoutLink TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      assignedFinanceUserId BIGINT REFERENCES users(id) ON DELETE SET NULL,
      receiptUrl TEXT NOT NULL DEFAULT '',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`UPDATE automations SET sortOrder = id WHERE sortOrder IS NULL OR sortOrder = 0`);

  console.log('PostgreSQL conectado');
  return getDb();
}

export function getDb() {
  if (!pool) throw new Error('Banco de dados não inicializado');
  return {
    async all(sql, params = []) {
      const result = await pool.query(convertPlaceholders(sql), params);
      return result.rows;
    },
    async get(sql, params = []) {
      const result = await pool.query(convertPlaceholders(sql), params);
      return result.rows[0] ?? null;
    },
    async run(sql, params = []) {
      const trimmed = sql.trim();
      const withReturning = /^(insert|update|delete)/i.test(trimmed) && !/returning\s+/i.test(trimmed)
        ? `${trimmed} RETURNING id`
        : trimmed;
      const result = await pool.query(convertPlaceholders(withReturning), params);
      return convertRunResult(result);
    },
    async exec(sql) {
      const commands = sql
        .split(';')
        .map((command) => command.trim())
        .filter(Boolean);
      for (const command of commands) {
        const normalized = normalizeSql(command);
        if (/PRAGMA/i.test(normalized) || /sqlite_sequence/i.test(normalized)) continue;
        await pool.query(normalized);
      }
    },
    query(sql, params = []) {
      return pool.query(convertPlaceholders(sql), params);
    },
    async close() {
      await pool.end();
      pool = null;
    }
  };
}

export async function resetDatabase() {
  const db = getDb();
  await db.exec(`
    TRUNCATE TABLE audit_logs, payment_requests, whatsapp_connections, messages, contacts, automations, users RESTART IDENTITY CASCADE;
  `);
}

export function parseJsonSafely(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function mapUser(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    name: row.name,
    surname: row.surname,
    fullName: `${row.name} ${row.surname}`.trim(),
    email: row.email,
    role: row.role,
    position: row.position,
    cpf: row.cpf,
    whatsapp: row.whatsapp,
    workplace: row.workplace,
    isFinanceiro: mapBooleanish(row.isfinanceiro ?? row.isFinanceiro),
    isGoogleUser: mapBooleanish(row.isgoogleuser ?? row.isGoogleUser),
    avatar: row.avatar,
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt
  };
}

export function mapContact(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    tags: parseJsonSafely(row.tags, []),
    notes: row.notes,
    assignedTo: row.assignedtoid || row.assignedToId
      ? {
          _id: String(row.assignedtoid ?? row.assignedToId),
          id: String(row.assignedtoid ?? row.assignedToId),
          name: row.assignedtoname ?? row.assignedToName,
          surname: row.assignedtosurname ?? row.assignedToSurname ?? '',
          fullName: `${row.assignedtoname ?? row.assignedToName ?? ''} ${row.assignedtosurname ?? row.assignedToSurname ?? ''}`.trim(),
          email: row.assignedtoemail ?? row.assignedToEmail,
          role: row.assignedtorole ?? row.assignedToRole ?? '',
          position: row.assignedtoposition ?? row.assignedToPosition ?? ''
        }
      : null,
    lastMessageAt: row.lastmessageat ?? row.lastMessageAt,
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt
  };
}

export function mapMessage(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    contact: String(row.contactid ?? row.contactId),
    senderType: row.sendertype ?? row.senderType,
    senderUserId: row.senderuserid ?? row.senderUserId ? String(row.senderuserid ?? row.senderUserId) : null,
    senderUserName: row.senderusername ?? row.senderUserName ?? '',
    senderUserRole: row.senderuserrole ?? row.senderUserRole ?? '',
    senderUserPosition: row.senderuserposition ?? row.senderUserPosition ?? '',
    text: row.text,
    type: row.type,
    direction: row.direction,
    status: row.status,
    meta: parseJsonSafely(row.meta, {}),
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt
  };
}

export function mapAutomation(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    name: row.name,
    trigger: row.trigger,
    keyword: row.keyword,
    isActive: mapBooleanish(row.isactive ?? row.isActive),
    sortOrder: Number(row.sortorder ?? row.sortOrder ?? 0),
    nodes: parseJsonSafely(row.nodes, []),
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt
  };
}

export function mapAuditLog(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    entityType: row.entitytype ?? row.entityType,
    entityId: row.entityid ?? row.entityId,
    action: row.action,
    changedByUserId: row.changedbyuserid ?? row.changedByUserId ? String(row.changedbyuserid ?? row.changedByUserId) : null,
    changedByName: row.changedbyname ?? row.changedByName,
    field: row.field,
    beforeValue: row.beforevalue ?? row.beforeValue,
    afterValue: row.aftervalue ?? row.afterValue,
    details: parseJsonSafely(row.details, {}),
    createdAt: row.createdat ?? row.createdAt
  };
}

export function mapConnection(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    userId: String(row.userid ?? row.userId),
    userName: row.username ?? row.userName || '',
    connectionName: row.connectionname ?? row.connectionName,
    mode: row.mode,
    status: row.status,
    phoneNumber: row.phonenumber ?? row.phoneNumber,
    qrCode: row.qrcode ?? row.qrCode,
    pairingCode: row.pairingcode ?? row.pairingCode,
    webhookUrl: row.webhookurl ?? row.webhookUrl,
    connectedAt: row.connectedat ?? row.connectedAt || '',
    notes: row.notes || '',
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt
  };
}
