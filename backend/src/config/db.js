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
      const withReturning =
        /^(insert|update|delete)/i.test(trimmed) && !/returning\s+/i.test(trimmed)
          ? `${trimmed} RETURNING id`
          : trimmed;

      const result = await pool.query(convertPlaceholders(withReturning), params);
      return {
        lastID: result.rows?.[0]?.id ?? null,
        changes: result.rowCount ?? 0
      };
    },
    async exec(sql) {
      const commands = sql
        .split(';')
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
    }
  };
}
