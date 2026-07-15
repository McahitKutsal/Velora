import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

function resolveConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) return { url, authToken };

  // No remote URL: fall back to a local SQLite file. NOT valid on Vercel/
  // serverless because their filesystem is read-only.
  if (process.env.VERCEL) {
    throw new Error(
      'TURSO_DATABASE_URL is not set. On Vercel the local SQLite file cannot be used; configure Turso and set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.'
    );
  }

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'velora.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return { url: `file:${dbPath}` };
}

let clientPromise = null;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id    TEXT    UNIQUE NOT NULL,
    email        TEXT    NOT NULL,
    name         TEXT,
    picture      TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS investments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    type         TEXT    NOT NULL,
    symbol       TEXT,
    notes        TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id)`,
  `CREATE TABLE IF NOT EXISTS investment_lots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    investment_id   INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    buy_price       REAL    NOT NULL,
    quantity        REAL    NOT NULL,
    buy_date        TEXT,
    position        INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lots_investment ON investment_lots(investment_id)`,
  `CREATE TABLE IF NOT EXISTS todos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         TEXT    NOT NULL,
    description   TEXT,
    priority      TEXT    NOT NULL DEFAULT 'medium',
    category      TEXT,
    due_date      TEXT,
    completed     INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id)`,
  `CREATE TABLE IF NOT EXISTS decks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    description  TEXT,
    color        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id)`,
  `CREATE TABLE IF NOT EXISTS flashcards (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id        INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front          TEXT    NOT NULL,
    back           TEXT    NOT NULL,
    notes          TEXT,
    repetitions    INTEGER NOT NULL DEFAULT 0,
    ease_factor    REAL    NOT NULL DEFAULT 2.5,
    interval_days  INTEGER NOT NULL DEFAULT 0,
    due_date       TEXT    NOT NULL DEFAULT (date('now')),
    last_reviewed  TEXT,
    lapses         INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flashcards_user_due ON flashcards(user_id, due_date)`,
  `CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id       INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    deck_id       INTEGER REFERENCES decks(id) ON DELETE SET NULL,
    rating        TEXT    NOT NULL,
    interval_days INTEGER NOT NULL DEFAULT 0,
    reviewed_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_user ON flashcard_reviews(user_id, reviewed_at)`,
];

async function init(client) {
  for (const sql of SCHEMA_STATEMENTS) {
    await client.execute(sql);
  }
}

export function getDb() {
  if (clientPromise) return clientPromise;

  const config = resolveConfig();
  const client = createClient(config);

  clientPromise = init(client)
    .then(() => client)
    .catch((err) => {
      // Reset so a later request can retry instead of holding a broken promise.
      clientPromise = null;
      throw err;
    });

  return clientPromise;
}
