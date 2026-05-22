import { getDb } from '../db';

export function upsertGoogleUser({ googleId, email, name, picture }) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

  if (existing) {
    db.prepare('UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?').run(
      email,
      name,
      picture,
      existing.id
    );
    return { id: existing.id, googleId, email, name, picture };
  }

  const info = db
    .prepare('INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)')
    .run(googleId, email, name, picture);
  return { id: info.lastInsertRowid, googleId, email, name, picture };
}
