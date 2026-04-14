function cleanEnvValue(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^['"]|['"]$/g, '');
}

export function getEnv(name, fallback = undefined) {
  const value = cleanEnvValue(process.env[name]);
  return value === '' || value === undefined ? fallback : value;
}

export function getDatabaseUrl() {
  const candidates = [
    getEnv('DATABASE_URL'),
    getEnv('DATABASE_PUBLIC_URL'),
    getEnv('POSTGRES_URL'),
    getEnv('PG_URL')
  ].filter(Boolean);

  const connectionString = candidates[0];
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada');
  }

  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL inválida. Use a URL pública completa do PostgreSQL da Railway/Render.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL inválida. O protocolo deve ser postgres:// ou postgresql://');
  }

  if (!parsed.hostname) {
    throw new Error('DATABASE_URL inválida. Host ausente.');
  }

  return connectionString;
}

export function shouldUseSSL(databaseUrl) {
  const explicit = getEnv('PGSSL');
  if (explicit) return explicit === 'true';

  try {
    const { hostname } = new URL(databaseUrl);
    return !['localhost', '127.0.0.1'].includes(hostname) && !hostname.endsWith('.internal');
  } catch {
    return true;
  }
}

export function getAllowedOrigins() {
  const raw = getEnv('FRONTEND_URL', 'http://localhost:5173');
  return raw
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function getRequiredSecret(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} não configurada`);
  }
  return value;
}
