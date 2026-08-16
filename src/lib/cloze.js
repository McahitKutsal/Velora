// Örnek cümlede kartın kelimesini bulup boşluğa çevirir ("cümlede boşluk"
// aktivitesi). Kelime cümlede çekimli geçebildiği için (дом → домой,
// Haus → Hauses) tam eşleşme bulunamazsa gövde eşleşmesine düşülür.

const WORD_RE = /(\p{L}[\p{L}\p{M}'’-]*)/gu;

/** Kart ön yüzündeki asıl kelime: "das Haus" → "Haus" (en uzun kelime). */
export function targetWord(front) {
  const words = String(front || '').match(WORD_RE) || [];
  if (words.length === 0) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

/** Boşluk doldurmaya uygun, tek satırlık ve makul uzunlukta bir cümle mi? */
function usableSentence(text) {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= 160;
}

// Token, kelimenin çekimli hâli olabilir mi? Kısa kelimelerde gövde eşleşmesi
// yanlış kelimeyi yakalayabildiği için yalnız tam eşleşme kabul edilir.
function inflectionOf(token, word) {
  const t = token.toLowerCase();
  const w = word.toLowerCase();
  if (t === w) return true;
  if (w.length < 3) return false;
  const stem = w.length > 5 ? w.slice(0, w.length - 2) : w;
  return t.startsWith(stem) && t.length - stem.length <= 4;
}

/**
 * @returns {{before:string, after:string, answer:string, base:string, sentence:string}|null}
 *   answer: cümlede geçen (çekimli) hâli, base: karttaki temel hâli.
 *   Cümle yoksa ya da kelime cümlede bulunamazsa null.
 */
export function buildCloze(sentence, front) {
  const word = targetWord(front);
  if (!usableSentence(sentence) || !word) return null;

  const tokens = [...sentence.matchAll(WORD_RE)];
  const hit =
    tokens.find((m) => m[0].toLowerCase() === word.toLowerCase()) ||
    tokens.find((m) => inflectionOf(m[0], word));
  if (!hit) return null;

  const start = hit.index;
  return {
    before: sentence.slice(0, start),
    after: sentence.slice(start + hit[0].length),
    answer: hit[0],
    base: word,
    sentence,
  };
}
