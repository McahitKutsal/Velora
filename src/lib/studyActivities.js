// Çalışma aktiviteleri ve "Karışık" oturumun aktivite seçimi.
//
// mode: kullanıcının seçtiği şey ('mixed' dahil).
// activity: o an ekranda gösterilen aktivite — karışık modda karttan karta değişir.

export const ACTIVITIES = ['flip', 'choice', 'type', 'listen', 'scramble', 'cloze'];
export const MODES = ['mixed', ...ACTIVITIES];

/** Harfleri dizme aktivitesinin taşları (boşluklar taş olmaz). */
export function scrambleLetters(word) {
  return Array.from(String(word || '').replace(/\s+/g, ''));
}

/** Çok kısa/çok uzun kelimelerde harf dizme anlamsızlaşır. */
export function canScramble(word) {
  const n = scrambleLetters(word).length;
  return n >= 2 && n <= 16;
}

/**
 * Karışık oturumda kart için aktivite seçer: yeni kartta tanıma, öğrenilen
 * kartta üretim, olgun kartta bağlam/dinleme. Seçim kartın id'sine bağlı
 * olduğundan aynı kart için her render'da aynı sonucu verir.
 */
export function pickActivity(card, { canChoice, canListen, clozeMissed } = {}) {
  if (!card) return 'flip';

  const recognize = canChoice ? 'choice' : 'flip';
  const produce = canScramble(card.front) ? 'scramble' : 'type';
  // Aynı aşamadaki kartlar hep aynı aktiviteye düşmesin diye id'ye göre değişir.
  const alternate = Number(card.id) % 2 === 0;

  // Sürekli unutulan kartta zoru dayatma, tanımaya geri dön.
  if (card.leech) return recognize;

  switch (card.status) {
    case 'new':
      return recognize;
    case 'learning':
      return produce;
    case 'young':
      return alternate && canListen ? 'listen' : produce;
    case 'mature':
      if (!clozeMissed) return 'cloze';
      return canListen && alternate ? 'listen' : 'type';
    default:
      return recognize;
  }
}
