import pg from "pg";

const { Pool } = pg;

let pool = null;

function convertPlaceholders(sql = "") {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function convertRunResult(result) {
  return {
    lastID: result.rows?.[0]?.id ?? null,
    changes: result.rowCount ?? 0,
  };
}

function mapBooleanish(value) {
  return value === true || value === 1 || value === "1";
}

export function parseJsonSafely(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
import dotenv from "dotenv";
dotenv.config();
export async function connectDB(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada");
  }

  if (pool) {
    return getDb();
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.PGSSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await pool.query("SELECT 1");

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
      isfinanceiro SMALLINT NOT NULL DEFAULT 0,
      isgoogleuser SMALLINT NOT NULL DEFAULT 0,
      googleid TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'novo_lead',
      tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      assignedto BIGINT REFERENCES users(id) ON DELETE SET NULL,
      lastmessageat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      contactid BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      sendertype TEXT NOT NULL,
      senderuserid BIGINT REFERENCES users(id) ON DELETE SET NULL,
      text TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text',
      direction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      meta TEXT NOT NULL DEFAULT '{}',
      createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS automations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      trigger TEXT NOT NULL DEFAULT 'keyword',
      keyword TEXT NOT NULL DEFAULT '',
      isactive SMALLINT NOT NULL DEFAULT 1,
      sortorder INTEGER NOT NULL DEFAULT 0,
      nodes TEXT NOT NULL DEFAULT '[]',
      createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      entitytype TEXT NOT NULL,
      entityid TEXT NOT NULL,
      action TEXT NOT NULL,
      changedbyuserid BIGINT REFERENCES users(id) ON DELETE SET NULL,
      changedbyname TEXT NOT NULL DEFAULT '',
      field TEXT NOT NULL DEFAULT '',
      beforevalue TEXT NOT NULL DEFAULT '',
      aftervalue TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '{}',
      createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS whatsapp_connections (
      id BIGSERIAL PRIMARY KEY,
      userid BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connectionname TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'cloud_api',
      status TEXT NOT NULL DEFAULT 'pending',
      phonenumber TEXT NOT NULL DEFAULT '',
      qrcode TEXT NOT NULL DEFAULT '',
      pairingcode TEXT NOT NULL DEFAULT '',
      accesscode TEXT NOT NULL DEFAULT '',
      accesscodeexpiresat TEXT NOT NULL DEFAULT '',
      webhookurl TEXT NOT NULL DEFAULT '',
      connectedat TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id BIGSERIAL PRIMARY KEY,
      contactid BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      automationid BIGINT REFERENCES automations(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      pixkey TEXT NOT NULL DEFAULT '',
      pixqrcode TEXT NOT NULL DEFAULT '',
      checkoutlink TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      assignedfinanceuserid BIGINT REFERENCES users(id) ON DELETE SET NULL,
      receipturl TEXT NOT NULL DEFAULT '',
      createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    UPDATE automations
    SET sortorder = id
    WHERE sortorder IS NULL OR sortorder = 0
  `);

  console.log("PostgreSQL conectado");
  return getDb();
}

export function getDb() {
  if (!pool) {
    throw new Error("Banco de dados não inicializado");
  }

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
      const needsReturning =
        /^(insert|update|delete)/i.test(trimmed) &&
        !/returning\s+/i.test(trimmed);

      const finalSql = needsReturning ? `${trimmed} RETURNING id` : trimmed;
      const result = await pool.query(convertPlaceholders(finalSql), params);

      return convertRunResult(result);
    },

    async exec(sql) {
      const commands = sql
        .split(";")
        .map((command) => command.trim())
        .filter(Boolean);

      for (const command of commands) {
        await pool.query(command);
      }
    },

    query(sql, params = []) {
      return pool.query(convertPlaceholders(sql), params);
    },

    async close() {
      await pool.end();
      pool = null;
    },
  };
}

export async function resetDatabase() {
  const db = getDb();

  await db.exec(`
    TRUNCATE TABLE
      audit_logs,
      payment_requests,
      whatsapp_connections,
      messages,
      contacts,
      automations,
      users
    RESTART IDENTITY CASCADE
  `);
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
    updatedAt: row.updatedat ?? row.updatedAt,
  };
}

export function mapContact(row) {
  if (!row) return null;

  const assignedId = row.assignedto ?? row.assignedTo ?? row.assignedtoid ?? row.assignedToId;

  return {
    _id: String(row.id),
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    tags: parseJsonSafely(row.tags, []),
    notes: row.notes,
    assignedTo: assignedId
      ? {
          _id: String(assignedId),
          id: String(assignedId),
          name: row.assignedtoname ?? row.assignedToName ?? "",
          surname: row.assignedtosurname ?? row.assignedToSurname ?? "",
          fullName: `${row.assignedtoname ?? row.assignedToName ?? ""} ${row.assignedtosurname ?? row.assignedToSurname ?? ""}`.trim(),
          email: row.assignedtoemail ?? row.assignedToEmail ?? "",
          role: row.assignedtorole ?? row.assignedToRole ?? "",
          position: row.assignedtoposition ?? row.assignedToPosition ?? "",
        }
      : null,
    lastMessageAt: row.lastmessageat ?? row.lastMessageAt,
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt,
  };
}

export function mapMessage(row) {
  if (!row) return null;

  const senderUserId = row.senderuserid ?? row.senderUserId;

  return {
    _id: String(row.id),
    id: String(row.id),
    contact: String(row.contactid ?? row.contactId),
    senderType: row.sendertype ?? row.senderType,
    senderUserId: senderUserId ? String(senderUserId) : null,
    senderUserName: row.senderusername ?? row.senderUserName ?? "",
    senderUserRole: row.senderuserrole ?? row.senderUserRole ?? "",
    senderUserPosition: row.senderuserposition ?? row.senderUserPosition ?? "",
    text: row.text,
    type: row.type,
    direction: row.direction,
    status: row.status,
    meta: parseJsonSafely(row.meta, {}),
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt,
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
    updatedAt: row.updatedat ?? row.updatedAt,
  };
}

export function mapAuditLog(row) {
  if (!row) return null;

  const changedByUserId = row.changedbyuserid ?? row.changedByUserId;

  return {
    _id: String(row.id),
    id: String(row.id),
    entityType: row.entitytype ?? row.entityType,
    entityId: row.entityid ?? row.entityId,
    action: row.action,
    changedByUserId: changedByUserId ? String(changedByUserId) : null,
    changedByName: row.changedbyname ?? row.changedByName,
    field: row.field,
    beforeValue: row.beforevalue ?? row.beforeValue,
    afterValue: row.aftervalue ?? row.afterValue,
    details: parseJsonSafely(row.details, {}),
    createdAt: row.createdat ?? row.createdAt,
  };
}

export function mapConnection(row) {
  if (!row) return null;

  return {
    _id: String(row.id),
    id: String(row.id),
    userId: String(row.userid ?? row.userId),
    userName: row.username ?? row.userName ?? "",
    connectionName: row.connectionname ?? row.connectionName,
    mode: row.mode,
    status: row.status,
    phoneNumber: row.phonenumber ?? row.phoneNumber,
    qrCode: row.qrcode ?? row.qrCode,
    pairingCode: row.pairingcode ?? row.pairingCode,
    webhookUrl: row.webhookurl ?? row.webhookUrl,
    connectedAt: row.connectedat ?? row.connectedAt ?? "",
    notes: row.notes ?? "",
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt,
  };
}

export function mapPaymentRequest(row) {
  if (!row) return null;

  return {
    _id: String(row.id),
    id: String(row.id),
    contactId: String(row.contactid ?? row.contactId),
    automationId: row.automationid ?? row.automationId
      ? String(row.automationid ?? row.automationId)
      : null,
    title: row.title,
    amount: Number(row.amount ?? 0),
    pixKey: row.pixkey ?? row.pixKey ?? "",
    pixQrCode: row.pixqrcode ?? row.pixQrCode ?? "",
    checkoutLink: row.checkoutlink ?? row.checkoutLink ?? "",
    status: row.status,
    assignedFinanceUserId: row.assignedfinanceuserid ?? row.assignedFinanceUserId
      ? String(row.assignedfinanceuserid ?? row.assignedFinanceUserId)
      : null,
    receiptUrl: row.receipturl ?? row.receiptUrl ?? "",
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt,
  };
}
