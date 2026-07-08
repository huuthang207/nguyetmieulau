const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { env } = require('../config/env');
const { MIGRATIONS_BY_DIALECT } = require('./migrations');
const { parseMySqlUrl } = require('./mysql-url');

function ensureDatabaseDirectory(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function createSqliteAdapter(databasePath) {
  ensureDatabaseDirectory(databasePath);

  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');

  return {
    dialect: 'sqlite',

    async queryOne(sql, params = []) {
      return db.prepare(sql).get(...params) || null;
    },

    async queryAll(sql, params = []) {
      return db.prepare(sql).all(...params);
    },

    async execute(sql, params = []) {
      const result = db.prepare(sql).run(...params);
      return {
        changes: result.changes,
        lastInsertId: Number(result.lastInsertRowid || 0),
      };
    },

    async exec(sql) {
      db.exec(sql);
    },

    async transaction(callback) {
      db.exec('BEGIN');

      try {
        const result = await callback(this);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },

    async close() {
      db.close();
    },
  };
}

function createMySqlConnectionAdapter(connection) {
  return {
    dialect: 'mysql',

    async queryOne(sql, params = []) {
      const [rows] = await connection.execute(sql, params);
      return rows[0] || null;
    },

    async queryAll(sql, params = []) {
      const [rows] = await connection.execute(sql, params);
      return rows;
    },

    async execute(sql, params = []) {
      const [result] = await connection.execute(sql, params);
      return {
        changes: result.affectedRows || 0,
        lastInsertId: Number(result.insertId || 0),
      };
    },

    async exec(sql) {
      await connection.query(sql);
    },
  };
}

function createMySqlAdapter(pool) {
  return {
    dialect: 'mysql',

    async queryOne(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return rows[0] || null;
    },

    async queryAll(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },

    async execute(sql, params = []) {
      const [result] = await pool.execute(sql, params);
      return {
        changes: result.affectedRows || 0,
        lastInsertId: Number(result.insertId || 0),
      };
    },

    async exec(sql) {
      await pool.query(sql);
    },

    async transaction(callback) {
      const connection = await pool.getConnection();
      const tx = createMySqlConnectionAdapter(connection);

      try {
        await connection.beginTransaction();
        const result = await callback(tx);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}

async function createMySqlDatabase(config) {
  const mysql = require('mysql2/promise');
  const connectionConfig = parseMySqlUrl(config.databaseUrl, {
    ssl: config.mysqlSsl ?? undefined,
    sslRejectUnauthorized: config.mysqlSslRejectUnauthorized ?? undefined,
  });
  const pool = mysql.createPool({
    ...connectionConfig,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
  });

  return createMySqlAdapter(pool);
}

async function applyMigrations(db) {
  const migrations = MIGRATIONS_BY_DIALECT[db.dialect];
  if (!migrations) {
    throw new Error(`Unsupported database dialect: ${db.dialect}`);
  }

  if (db.dialect === 'mysql') {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(191) PRIMARY KEY,
        applied_at VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);
  }

  for (const migration of migrations) {
    const existing = await db.queryOne('SELECT id FROM schema_migrations WHERE id = ?', [migration.id]);

    if (existing) {
      continue;
    }

    await db.transaction(async (tx) => {
      for (const statement of migration.statements) {
        await tx.exec(statement);
      }

      await tx.execute('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [
        migration.id,
        new Date().toISOString(),
      ]);
    });
  }
}

async function createDatabase(config = env) {
  const resolvedConfig = typeof config === 'string'
    ? { databaseClient: 'sqlite', databasePath: config }
    : config;
  const db = resolvedConfig.databaseClient === 'mysql'
    ? await createMySqlDatabase(resolvedConfig)
    : createSqliteAdapter(resolvedConfig.databasePath || env.databasePath);

  await applyMigrations(db);
  return db;
}

module.exports = {
  createDatabase,
  applyMigrations,
};
