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

export async function listTodos(userId) {
  const db = await getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM todos WHERE user_id = ? ORDER BY completed ASC, datetime(created_at) DESC, id DESC',
    args: [userId],
  });
  return result.rows.map(mapRow);
}

export async function createTodo(userId, payload) {
  const db = await getDb();
  const info = await db.execute({
    sql: 'INSERT INTO todos (user_id, title, description, priority, category, due_date, completed) VALUES (?, ?, ?, ?, ?, ?, 0)',
    args: [
      userId,
      payload.title,
      payload.description || null,
      payload.priority || 'medium',
      payload.category || null,
      payload.due_date || null,
    ],
  });
  return { id: String(info.lastInsertRowid) };
}

export async function updateTodo(userId, id, payload) {
  const db = await getDb();
  const result = await db.execute({
    sql: 'UPDATE todos SET title = ?, description = ?, priority = ?, category = ?, due_date = ? WHERE id = ? AND user_id = ?',
    args: [
      payload.title,
      payload.description || null,
      payload.priority || 'medium',
      payload.category || null,
      payload.due_date || null,
      id,
      userId,
    ],
  });
  return { success: result.rowsAffected > 0 };
}

export async function deleteTodo(userId, id) {
  const db = await getDb();
  const result = await db.execute({
    sql: 'DELETE FROM todos WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  return { success: result.rowsAffected > 0 };
}

export async function toggleTodo(userId, id) {
  const db = await getDb();
  const row = await db.execute({
    sql: 'SELECT completed FROM todos WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  if (row.rows.length === 0) return { success: false };
  const next = row.rows[0].completed ? 0 : 1;
  await db.execute({
    sql: 'UPDATE todos SET completed = ? WHERE id = ? AND user_id = ?',
    args: [next, id, userId],
  });
  return { success: true, completed: !!next };
}
