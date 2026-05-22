import { getDb } from '../db';

async function rowToInvestment(db, row) {
  const lotsResult = await db.execute({
    sql: 'SELECT id, buy_price, quantity, buy_date FROM investment_lots WHERE investment_id = ? ORDER BY position ASC, id ASC',
    args: [row.id],
  });
  const lots = lotsResult.rows.map((l) => ({
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

export async function listInvestments(userId) {
  const db = await getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM investments WHERE user_id = ? ORDER BY sort_order ASC, datetime(created_at) DESC, id DESC',
    args: [userId],
  });
  return Promise.all(result.rows.map((r) => rowToInvestment(db, r)));
}

export async function createInvestment(userId, payload) {
  const db = await getDb();
  const { name, type, symbol, notes, lots } = payload;

  const orderRes = await db.execute({
    sql: 'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM investments WHERE user_id = ?',
    args: [userId],
  });
  const nextOrder = Number(orderRes.rows[0].next);

  const tx = await db.transaction('write');
  try {
    const info = await tx.execute({
      sql: 'INSERT INTO investments (user_id, name, type, symbol, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      args: [userId, name, type, symbol || null, notes || null, nextOrder],
    });
    const id = info.lastInsertRowid;

    for (let i = 0; i < (lots || []).length; i++) {
      const lot = lots[i];
      await tx.execute({
        sql: 'INSERT INTO investment_lots (investment_id, buy_price, quantity, buy_date, position) VALUES (?, ?, ?, ?, ?)',
        args: [id, Number(lot.buy_price) || 0, Number(lot.quantity) || 0, lot.buy_date || null, i],
      });
    }

    await tx.commit();
    return { id: String(id) };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export async function updateInvestment(userId, id, payload) {
  const db = await getDb();
  const { name, type, symbol, notes, lots } = payload;

  const tx = await db.transaction('write');
  try {
    const upd = await tx.execute({
      sql: 'UPDATE investments SET name = ?, type = ?, symbol = ?, notes = ? WHERE id = ? AND user_id = ?',
      args: [name, type, symbol || null, notes || null, id, userId],
    });
    if (upd.rowsAffected === 0) {
      await tx.rollback();
      return { success: false };
    }

    await tx.execute({
      sql: 'DELETE FROM investment_lots WHERE investment_id = ?',
      args: [id],
    });

    for (let i = 0; i < (lots || []).length; i++) {
      const lot = lots[i];
      await tx.execute({
        sql: 'INSERT INTO investment_lots (investment_id, buy_price, quantity, buy_date, position) VALUES (?, ?, ?, ?, ?)',
        args: [id, Number(lot.buy_price) || 0, Number(lot.quantity) || 0, lot.buy_date || null, i],
      });
    }

    await tx.commit();
    return { success: true };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export async function deleteInvestment(userId, id) {
  const db = await getDb();
  const result = await db.execute({
    sql: 'DELETE FROM investments WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  return { success: result.rowsAffected > 0 };
}
