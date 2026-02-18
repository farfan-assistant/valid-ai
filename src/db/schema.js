import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

let db;

export function getDb(dbPath) {
  if (db) return db;

  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS validations (
      id TEXT PRIMARY KEY,
      idea TEXT NOT NULL,
      category TEXT,
      score INTEGER,
      result TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_validations_created
      ON validations(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_validations_score
      ON validations(score DESC);

    CREATE INDEX IF NOT EXISTS idx_validations_status
      ON validations(status);
  `);

  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
