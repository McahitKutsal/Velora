/**
 * Spaced-repetition scheduler.
 *
 * A day-granular variant of the SM-2 algorithm (the one Anki is based on).
 * The user rates each answer with one of four buttons; from the card's current
 * state we derive the next interval, ease factor and due date.
 *
 * State kept per card:
 *   - repetitions:  number of consecutive successful reviews (reset on "again")
 *   - ease_factor:  difficulty multiplier, starts at 2.5, floored at 1.3
 *   - interval_days: days until the card is due again (0 = still due today)
 *   - due_date:     ISO date (YYYY-MM-DD) the card next becomes due
 */

export const RATINGS = ['again', 'hard', 'good', 'easy'];

const MIN_EF = 1.3;
const DEFAULT_EF = 2.5;

// UI metadata for the four rating buttons (Turkish labels).
// Renkler temada (palette.data.rating) yaşar; burada yalnız metin/kısayol var.
export const RATING_META = {
  again: { label: 'Tekrar', hotkey: '1' },
  hard: { label: 'Zor', hotkey: '2' },
  good: { label: 'Normal', hotkey: '3' },
  easy: { label: 'Kolay', hotkey: '4' },
};

function clampEf(ef) {
  return Math.max(MIN_EF, Number(ef.toFixed(2)));
}

/** Add `days` calendar days to an ISO date string (UTC, day granularity). */
export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date (UTC) as YYYY-MM-DD. Callers may pass an override for testing. */
export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Compute the next scheduling state for a card given a rating.
 *
 * @param {{repetitions?:number, ease_factor?:number, interval_days?:number}} card
 * @param {'again'|'hard'|'good'|'easy'} rating
 * @param {string} today  ISO date used as the anchor for the next due date
 * @returns {{repetitions:number, ease_factor:number, interval_days:number, due_date:string, lapsed:boolean}}
 */
export function schedule(card, rating, today = todayIso()) {
  let repetitions = card.repetitions || 0;
  let ef = card.ease_factor || DEFAULT_EF;
  let interval = card.interval_days || 0;
  let lapsed = false;

  switch (rating) {
    case 'again': {
      // Failed recall: reset the streak and make it due again today so it
      // resurfaces within the same study session.
      lapsed = repetitions > 0;
      repetitions = 0;
      interval = 0;
      ef = clampEf(ef - 0.2);
      break;
    }
    case 'hard': {
      repetitions += 1;
      ef = clampEf(ef - 0.15);
      interval = interval <= 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      break;
    }
    case 'good': {
      repetitions += 1;
      // ease factor unchanged for a "good" (q≈4) answer
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 6;
      else interval = Math.round(interval * ef);
      break;
    }
    case 'easy': {
      repetitions += 1;
      ef = clampEf(ef + 0.15);
      if (repetitions === 1) interval = 4;
      else if (repetitions === 2) interval = 8;
      else interval = Math.round(interval * ef * 1.3);
      break;
    }
    default:
      throw new Error(`Unknown rating: ${rating}`);
  }

  const due_date = interval <= 0 ? today : addDays(today, interval);
  return { repetitions, ease_factor: ef, interval_days: interval, due_date, lapsed };
}

/**
 * Preview the interval each button would produce, without mutating anything.
 * Used to label the rating buttons with "1g", "6g", etc.
 * @returns {{again:number, hard:number, good:number, easy:number}}
 */
export function previewIntervals(card, today = todayIso()) {
  const out = {};
  for (const rating of RATINGS) {
    out[rating] = schedule(card, rating, today).interval_days;
  }
  return out;
}

/** Human label for how far away an interval is (Turkish). */
export function formatInterval(days) {
  if (days <= 0) return '<10dk';
  if (days === 1) return '1 gün';
  if (days < 30) return `${days} gün`;
  if (days < 365) {
    const m = Math.round(days / 30);
    return m <= 1 ? '1 ay' : `${m} ay`;
  }
  const y = (days / 365).toFixed(1).replace('.0', '');
  return `${y} yıl`;
}

/** Learning stage of a card, derived from its SRS state. */
export function cardStatus(card) {
  if (!card.last_reviewed || card.repetitions === 0) {
    return card.last_reviewed ? 'learning' : 'new';
  }
  if (card.interval_days >= 21) return 'mature';
  return 'young';
}
