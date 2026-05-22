import { getDb } from '../db';

export async function upsertGoogleUser({ googleId, email, name, picture }) {
  const db = await getDb();

  const existing = await db.execute({
    sql: 'SELECT * FROM users WHERE google_id = ?',
    args: [googleId],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    await db.execute({
      sql: 'UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?',
      args: [email, name, picture, row.id],
    });
    return { id: Number(row.id), googleId, email, name, picture };
  }

  const info = await db.execute({
    sql: 'INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)',
    args: [googleId, email, name, picture],
  });
  return { id: Number(info.lastInsertRowid), googleId, email, name, picture };
}
