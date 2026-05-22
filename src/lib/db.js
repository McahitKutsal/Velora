import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DEFAULT_PATH = path.join(process.cwd(), 'data', 'velora.db');
const DB_PATH = process.env.DATABASE_PATH || DEFAULT_PATH;

let dbInstance = null;

function init(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id    TEXT    UNIQUE NOT NULL,
      email        TEXT    NOT NULL,
      name         TEXT,
      picture      TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS investments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT    NOT NULL,
      type         TEXT    NOT NULL,
      symbol       TEXT,
      notes        TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);

    CREATE TABLE IF NOT EXISTS investment_lots (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      investment_id   INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
      buy_price       REAL    NOT NULL,
      quantity        REAL    NOT NULL,
      buy_date        TEXT,
      position        INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_lots_investment ON investment_lots(investment_id);

    CREATE TABLE IF NOT EXISTS todos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      description   TEXT,
      priority      TEXT    NOT NULL DEFAULT 'medium',
      category      TEXT,
      due_date      TEXT,
      completed     INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
  `);
}

export function getDb() {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  dbInstance = new Database(DB_PATH);
  init(dbInstance);
  return dbInstance;
}
