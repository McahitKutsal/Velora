import { getDb } from '../db';
import { schedule, cardStatus, addDays, todayIso } from '../srs';

// Bu kadar çok kez unutulan kart "inatçı" (leech) sayılır.
export const LEECH_THRESHOLD = 4;

/* ------------------------------------------------------------------ */
/* Row mappers                                                         */
/* ------------------------------------------------------------------ */

function mapDeckRow(row) {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description,
    color: row.color,
    created_at: row.created_at,
    total: Number(row.total || 0),
    due: Number(row.due || 0),
    new_count: Number(row.new_count || 0),
  };
}

function mapCardRow(row) {
  const card = {
    id: String(row.id),
    deck_id: String(row.deck_id),
    front: row.front,
    back: row.back,
    notes: row.notes,
    image_url: row.image_url || null,
    repetitions: Number(row.repetitions || 0),
    ease_factor: Number(row.ease_factor || 2.5),
    interval_days: Number(row.interval_days || 0),
    due_date: row.due_date,
    last_reviewed: row.last_reviewed,
    lapses: Number(row.lapses || 0),
    created_at: row.created_at,
  };
  card.status = cardStatus(card);
  card.leech = card.lapses >= LEECH_THRESHOLD;
  return card;
}

/* ------------------------------------------------------------------ */
/* Decks                                                               */
/* ------------------------------------------------------------------ */

export async function listDecks(userId) {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT d.*,
            COUNT(f.id) AS total,
            SUM(CASE WHEN f.due_date <= date('now') THEN 1 ELSE 0 END) AS due,
            SUM(CASE WHEN f.last_reviewed IS NULL THEN 1 ELSE 0 END) AS new_count
          FROM decks d
          LEFT JOIN flashcards f ON f.deck_id = d.id
          WHERE d.user_id = ?
          GROUP BY d.id
          ORDER BY datetime(d.created_at) DESC, d.id DESC`,
    args: [userId],
  });
  return result.rows.map(mapDeckRow);
}

export async function getDeck(userId, deckId) {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT d.*,
            COUNT(f.id) AS total,
            SUM(CASE WHEN f.due_date <= date('now') THEN 1 ELSE 0 END) AS due,
            SUM(CASE WHEN f.last_reviewed IS NULL THEN 1 ELSE 0 END) AS new_count
          FROM decks d
          LEFT JOIN flashcards f ON f.deck_id = d.id
          WHERE d.id = ? AND d.user_id = ?
          GROUP BY d.id`,
    args: [deckId, userId],
  });
  if (result.rows.length === 0) return null;
  return mapDeckRow(result.rows[0]);
}

export async function createDeck(userId, payload) {
  const db = await getDb();
  const info = await db.execute({
    sql: 'INSERT INTO decks (user_id, name, description, color) VALUES (?, ?, ?, ?)',
    args: [
      userId,
      payload.name,
      payload.description || null,
      payload.color || null,
    ],
  });
  return { id: String(info.lastInsertRowid) };
}

export async function updateDeck(userId, id, payload) {
  const db = await getDb();
  const result = await db.execute({
    sql: 'UPDATE decks SET name = ?, description = ?, color = ? WHERE id = ? AND user_id = ?',
    args: [
      payload.name,
      payload.description || null,
      payload.color || null,
      id,
      userId,
    ],
  });
  return { success: result.rowsAffected > 0 };
}

export async function deleteDeck(userId, id) {
  const db = await getDb();
  // Delete children explicitly rather than relying on ON DELETE CASCADE, which
  // needs the foreign_keys pragma and does not reliably persist on Turso HTTP.
  const tx = await db.transaction('write');
  try {
    await tx.execute({
      sql: 'DELETE FROM flashcard_reviews WHERE deck_id = ? AND user_id = ?',
      args: [id, userId],
    });
    await tx.execute({
      sql: 'DELETE FROM flashcards WHERE deck_id = ? AND user_id = ?',
      args: [id, userId],
    });
    const result = await tx.execute({
      sql: 'DELETE FROM decks WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    await tx.commit();
    return { success: result.rowsAffected > 0 };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

async function assertDeckOwned(db, userId, deckId) {
  const owner = await db.execute({
    sql: 'SELECT id FROM decks WHERE id = ? AND user_id = ?',
    args: [deckId, userId],
  });
  if (owner.rows.length === 0) {
    const err = new Error('Deste bulunamadı');
    err.status = 404;
    throw err;
  }
}

export async function listCards(userId, deckId) {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM flashcards
          WHERE deck_id = ? AND user_id = ?
          ORDER BY datetime(created_at) DESC, id DESC`,
    args: [deckId, userId],
  });
  return result.rows.map(mapCardRow);
}

export async function createCard(userId, deckId, payload) {
  const db = await getDb();
  await assertDeckOwned(db, userId, deckId);
  const info = await db.execute({
    sql: `INSERT INTO flashcards (user_id, deck_id, front, back, notes, image_url)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      deckId,
      payload.front,
      payload.back,
      payload.notes || null,
      payload.image_url || null,
    ],
  });
  return { id: String(info.lastInsertRowid) };
}

/**
 * Bulk-create cards in one deck. `cards` is [{front, back, notes?}, ...].
 * Used by the "add many" flow.
 */
export async function createCards(userId, deckId, cards) {
  const db = await getDb();
  await assertDeckOwned(db, userId, deckId);
  const valid = (cards || []).filter((c) => c && c.front && c.back);
  let created = 0;
  for (const c of valid) {
    await db.execute({
      sql: `INSERT INTO flashcards (user_id, deck_id, front, back, notes)
            VALUES (?, ?, ?, ?, ?)`,
      args: [userId, deckId, c.front, c.back, c.notes || null],
    });
    created += 1;
  }
  return { created };
}

export async function updateCard(userId, id, payload) {
  const db = await getDb();
  const result = await db.execute({
    sql: 'UPDATE flashcards SET front = ?, back = ?, notes = ?, image_url = ? WHERE id = ? AND user_id = ?',
    args: [payload.front, payload.back, payload.notes || null, payload.image_url || null, id, userId],
  });
  return { success: result.rowsAffected > 0 };
}

export async function deleteCard(userId, id) {
  const db = await getDb();
  const tx = await db.transaction('write');
  try {
    await tx.execute({
      sql: 'DELETE FROM flashcard_reviews WHERE card_id = ? AND user_id = ?',
      args: [id, userId],
    });
    const result = await tx.execute({
      sql: 'DELETE FROM flashcards WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    await tx.commit();
    return { success: result.rowsAffected > 0 };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

/** Reset a card's SRS progress back to "new". */
export async function resetCard(userId, id) {
  const db = await getDb();
  const result = await db.execute({
    sql: `UPDATE flashcards
          SET repetitions = 0, ease_factor = 2.5, interval_days = 0,
              due_date = date('now'), last_reviewed = NULL, lapses = 0
          WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  return { success: result.rowsAffected > 0 };
}

/* ------------------------------------------------------------------ */
/* Study & review                                                      */
/* ------------------------------------------------------------------ */

const STUDY_LIMIT = 300;

/**
 * Cards due for study (due today or overdue, plus never-seen cards).
 * `deckId` may be 'all' to study across every deck.
 * When `cram` is true, every card in scope is returned regardless of its due
 * date (free practice that does not follow the schedule).
 * Returns { cards, pool } where pool holds candidate answers for the
 * multiple-choice mode.
 */
export async function getStudyQueue(userId, deckId, { cram = false } = {}) {
  const db = await getDb();
  const all = deckId === 'all' || deckId == null;
  if (!all) await assertDeckOwned(db, userId, deckId);

  const scope = all ? '' : 'AND deck_id = ?';
  const baseArgs = all ? [userId] : [userId, deckId];
  const dueFilter = cram ? '' : "AND due_date <= date('now')";

  const queue = await db.execute({
    sql: `SELECT * FROM flashcards
          WHERE user_id = ? ${scope} ${dueFilter}
          ORDER BY (last_reviewed IS NULL) ASC, due_date ASC, id ASC
          LIMIT ${STUDY_LIMIT}`,
    args: baseArgs,
  });

  const pool = await db.execute({
    sql: `SELECT id, back FROM flashcards
          WHERE user_id = ? ${scope}
          LIMIT 500`,
    args: baseArgs,
  });

  return {
    cards: queue.rows.map(mapCardRow),
    pool: pool.rows.map((r) => ({ id: String(r.id), back: r.back })),
  };
}

/**
 * Record a review for a card: advance its SRS state and append to the log.
 * @param {'again'|'hard'|'good'|'easy'} rating
 */
export async function reviewCard(userId, id, rating) {
  const db = await getDb();
  const found = await db.execute({
    sql: 'SELECT * FROM flashcards WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  if (found.rows.length === 0) {
    const err = new Error('Kart bulunamadı');
    err.status = 404;
    throw err;
  }

  const card = mapCardRow(found.rows[0]);
  const today = todayIso();
  const next = schedule(card, rating, today);

  await db.execute({
    sql: `UPDATE flashcards
          SET repetitions = ?, ease_factor = ?, interval_days = ?, due_date = ?,
              last_reviewed = datetime('now'), lapses = lapses + ?
          WHERE id = ? AND user_id = ?`,
    args: [
      next.repetitions,
      next.ease_factor,
      next.interval_days,
      next.due_date,
      next.lapsed ? 1 : 0,
      id,
      userId,
    ],
  });

  await db.execute({
    sql: `INSERT INTO flashcard_reviews (user_id, card_id, deck_id, rating, interval_days)
          VALUES (?, ?, ?, ?, ?)`,
    args: [userId, id, card.deck_id, rating, next.interval_days],
  });

  return {
    id: String(id),
    repetitions: next.repetitions,
    ease_factor: next.ease_factor,
    interval_days: next.interval_days,
    due_date: next.due_date,
  };
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export async function getStats(userId) {
  const db = await getDb();

  const [totals, decks, reviewedToday, breakdown, series, reviewDates, leech, forecast] = await Promise.all([
    db.execute({
      sql: `SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN due_date <= date('now') THEN 1 ELSE 0 END) AS due,
              SUM(CASE WHEN last_reviewed IS NULL THEN 1 ELSE 0 END) AS new_count
            FROM flashcards WHERE user_id = ?`,
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT COUNT(*) AS c FROM decks WHERE user_id = ?',
      args: [userId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) AS c FROM flashcard_reviews
            WHERE user_id = ? AND date(reviewed_at) = date('now')`,
      args: [userId],
    }),
    db.execute({
      sql: `SELECT
              SUM(CASE WHEN last_reviewed IS NULL THEN 1 ELSE 0 END) AS new_count,
              SUM(CASE WHEN last_reviewed IS NOT NULL AND interval_days < 21 THEN 1 ELSE 0 END) AS young,
              SUM(CASE WHEN interval_days >= 21 THEN 1 ELSE 0 END) AS mature
            FROM flashcards WHERE user_id = ?`,
      args: [userId],
    }),
    db.execute({
      sql: `SELECT date(reviewed_at) AS d, COUNT(*) AS c
            FROM flashcard_reviews
            WHERE user_id = ? AND reviewed_at >= datetime('now', '-13 days')
            GROUP BY d ORDER BY d ASC`,
      args: [userId],
    }),
    db.execute({
      sql: `SELECT DISTINCT date(reviewed_at) AS d
            FROM flashcard_reviews WHERE user_id = ?
            ORDER BY d DESC LIMIT 90`,
      args: [userId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) AS c FROM flashcards WHERE user_id = ? AND lapses >= ?`,
      args: [userId, LEECH_THRESHOLD],
    }),
    db.execute({
      sql: `SELECT due_date AS d, COUNT(*) AS c FROM flashcards
            WHERE user_id = ? AND due_date <= date('now', '+6 days')
            GROUP BY due_date`,
      args: [userId],
    }),
  ]);

  const t = totals.rows[0] || {};
  const b = breakdown.rows[0] || {};

  // Build a dense 14-day series (fill gaps with 0).
  const counts = {};
  series.rows.forEach((r) => { counts[r.d] = Number(r.c); });
  const today = todayIso();
  const dailySeries = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = addDays(today, -i);
    dailySeries.push({ date: d, count: counts[d] || 0 });
  }

  // 7 günlük vade tahmini: bugüne kadar (vadesi geçmişler dahil) + sonraki 6 gün.
  const dueByDate = {};
  forecast.rows.forEach((r) => { dueByDate[r.d] = Number(r.c); });
  const dueForecast = [];
  for (let i = 0; i <= 6; i += 1) {
    const d = addDays(today, i);
    let count;
    if (i === 0) {
      // Bugün: vadesi bugün veya daha önce olan her şey.
      count = Object.entries(dueByDate)
        .filter(([date]) => date <= today)
        .reduce((s, [, c]) => s + c, 0);
    } else {
      count = dueByDate[d] || 0;
    }
    dueForecast.push({ date: d, count });
  }

  // Current streak: consecutive days with reviews, counting back from today
  // (or yesterday, if nothing studied yet today).
  const dateSet = new Set(reviewDates.rows.map((r) => r.d));
  let streak = 0;
  let cursor = today;
  if (!dateSet.has(cursor)) cursor = addDays(cursor, -1);
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    totalCards: Number(t.total || 0),
    totalDecks: Number(decks.rows[0]?.c || 0),
    due: Number(t.due || 0),
    newCount: Number(t.new_count || 0),
    reviewedToday: Number(reviewedToday.rows[0]?.c || 0),
    streak,
    leechCount: Number(leech.rows[0]?.c || 0),
    breakdown: {
      new: Number(b.new_count || 0),
      young: Number(b.young || 0),
      mature: Number(b.mature || 0),
    },
    dailySeries,
    dueForecast,
  };
}
