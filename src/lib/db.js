import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Local dev: file:./data/velora.db (default)
// Production (Turso): libsql://<db>.turso.io + TURSO_AUTH_TOKEN
function resolveUrl() {
  const explicit = process.env.TURSO_DATABASE_URL;
  if (explicit) return explicit;
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'velora.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${dbPath}`;
}

let clientPromise = null;

const SCHEMA = `
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
`;

async function init(client) {
  await client.executeMultiple(SCHEMA);
}

export function getDb() {
  if (clientPromise) return clientPromise;

  const client = createClient({
    url: resolveUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  clientPromise = init(client).then(() => client);
  return clientPromise;
}
