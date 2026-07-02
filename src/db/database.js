const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { env } = require('../config/env');
const { MIGRATIONS } = require('./migrations');

function ensureDatabaseDirectory(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function applyMigrations(db) {
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  for (const migration of MIGRATIONS) {
    const existing = db
      .prepare('SELECT id FROM schema_migrations WHERE id = ?')
      .get(migration.id);

    if (existing) {
      continue;
    }

    db.exec('BEGIN');

    try {
      for (const statement of migration.statements) {
        db.exec(statement);
      }

      db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(
        migration.id,
        new Date().toISOString(),
      );

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

function createDatabase(databasePath = env.databasePath) {
  ensureDatabaseDirectory(databasePath);

  const db = new DatabaseSync(databasePath);
  applyMigrations(db);

  return db;
}

module.exports = {
  createDatabase,
};
