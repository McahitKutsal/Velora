import { getDb } from '../db';

function rowToInvestment(db, row) {
  const lots = db
    .prepare(
      'SELECT id, buy_price, quantity, buy_date FROM investment_lots WHERE investment_id = ? ORDER BY position ASC, id ASC'
    )
    .all(row.id)
    .map((l) => ({
      buy_price: l.buy_price,
      quantity: l.quantity,
      buy_date: l.buy_date || null,
    }));

  const totalQty = lots.reduce((s, l) => s + l.quantity, 0);
  const totalCost = lots.reduce((s, l) => s + l.buy_price * l.quantity, 0);
  const avgPrice = totalQty > 0 ? totalCost / totalQty : 0;

  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    symbol: row.symbol,
    notes: row.notes,
    lots,
    buy_price: avgPrice,
    quantity: totalQty,
    created_at: row.created_at,
  };
}

export function listInvestments(userId) {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM investments WHERE user_id = ? ORDER BY sort_order ASC, datetime(created_at) DESC, id DESC'
    )
    .all(userId);
  return rows.map((r) => rowToInvestment(db, r));
}

export function createInvestment(userId, payload) {
  const db = getDb();
  const { name, type, symbol, notes, lots } = payload;

  const insert = db.prepare(
    'INSERT INTO investments (user_id, name, type, symbol, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const nextOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM investments WHERE user_id = ?')
    .get(userId).next;

  const insertLot = db.prepare(
    'INSERT INTO investment_lots (investment_id, buy_price, quantity, buy_date, position) VALUES (?, ?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    const info = insert.run(userId, name, type, symbol || null, notes || null, nextOrder);
    const id = info.lastInsertRowid;
    (lots || []).forEach((lot, i) => {
      insertLot.run(id, Number(lot.buy_price) || 0, Number(lot.quantity) || 0, lot.buy_date || null, i);
    });
    return id;
  });

  const id = tx();
  return { id: String(id) };
}

export function updateInvestment(userId, id, payload) {
  const db = getDb();
  const { name, type, symbol, notes, lots } = payload;

  const update = db.prepare(
    'UPDATE investments SET name = ?, type = ?, symbol = ?, notes = ? WHERE id = ? AND user_id = ?'
  );
  const deleteLots = db.prepare('DELETE FROM investment_lots WHERE investment_id = ?');
  const insertLot = db.prepare(
    'INSERT INTO investment_lots (investment_id, buy_price, quantity, buy_date, position) VALUES (?, ?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    const result = update.run(name, type, symbol || null, notes || null, id, userId);
    if (result.changes === 0) return false;
    deleteLots.run(id);
    (lots || []).forEach((lot, i) => {
      insertLot.run(id, Number(lot.buy_price) || 0, Number(lot.quantity) || 0, lot.buy_date || null, i);
    });
    return true;
  });

  return { success: tx() };
}

export function deleteInvestment(userId, id) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM investments WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return { success: result.changes > 0 };
}
