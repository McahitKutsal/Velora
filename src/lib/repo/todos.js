import { getDb } from '../db';

function mapRow(row) {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    priority: row.priority,
    category: row.category,
    due_date: row.due_date,
    completed: !!row.completed,
    created_at: row.created_at,
  };
}

export function listTodos(userId) {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY completed ASC, datetime(created_at) DESC, id DESC'
    )
    .all(userId);
  return rows.map(mapRow);
}

export function createTodo(userId, payload) {
  const db = getDb();
  const info = db
    .prepare(
      'INSERT INTO todos (user_id, title, description, priority, category, due_date, completed) VALUES (?, ?, ?, ?, ?, ?, 0)'
    )
    .run(
      userId,
      payload.title,
      payload.description || null,
      payload.priority || 'medium',
      payload.category || null,
      payload.due_date || null
    );
  return { id: String(info.lastInsertRowid) };
}

export function updateTodo(userId, id, payload) {
  const db = getDb();
  const result = db
    .prepare(
      'UPDATE todos SET title = ?, description = ?, priority = ?, category = ?, due_date = ? WHERE id = ? AND user_id = ?'
    )
    .run(
      payload.title,
      payload.description || null,
      payload.priority || 'medium',
      payload.category || null,
      payload.due_date || null,
      id,
      userId
    );
  return { success: result.changes > 0 };
}

export function deleteTodo(userId, id) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return { success: result.changes > 0 };
}

export function toggleTodo(userId, id) {
  const db = getDb();
  const row = db
    .prepare('SELECT completed FROM todos WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!row) return { success: false };
  const next = row.completed ? 0 : 1;
  db.prepare('UPDATE todos SET completed = ? WHERE id = ? AND user_id = ?').run(next, id, userId);
  return { success: true, completed: !!next };
}
