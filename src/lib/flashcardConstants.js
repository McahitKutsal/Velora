// Kart modülünün paylaşılan sabitleri.

import { CATEGORICAL, DECK_SLOTS, STAGE } from './designTokens';

// Deste rengi veritabanında hex olarak saklanır; kanonik değer açık moddaki
// hex'tir, koyu modda karşılığına çevrilir (resolveDeckColor).
export const DECK_COLORS = DECK_SLOTS.map((i) => CATEGORICAL.light[i]);

// Eski palet -> yeni palet eşlemesi. Kimliğin değişmesi, önceden seçilmiş
// deste renklerinin sistem dışı kalmasına yol açmasın diye en yakın yeni
// slota taşınır.
const LEGACY = {
  '#4da8da': CATEGORICAL.light[0], // mavi
  '#22c55e': CATEGORICAL.light[5], // yeşil
  '#f59e0b': CATEGORICAL.light[3], // sarı
  '#f43f5e': CATEGORICAL.light[7], // kırmızı
  '#a855f7': CATEGORICAL.light[4], // mor -> magenta
  '#06b6d4': CATEGORICAL.light[2], // camgöbeği -> su yeşili
  '#ec4899': CATEGORICAL.light[4], // pembe -> magenta
  '#64748b': CATEGORICAL.light[1], // gri -> turuncu
};

const LIGHT_TO_DARK = CATEGORICAL.light.reduce((acc, hex, i) => {
  acc[hex.toLowerCase()] = CATEGORICAL.dark[i];
  return acc;
}, {});

/**
 * Saklanan deste rengini geçerli moda çevirir. Bilinmeyen bir değer (elle
 * girilmiş renk) olduğu gibi geçer.
 */
export function resolveDeckColor(stored, mode) {
  const base = LEGACY[String(stored || '').toLowerCase()] || stored || DECK_COLORS[0];
  if (mode !== 'dark') return base;
  return LIGHT_TO_DARK[String(base).toLowerCase()] || base;
}

// Öğrenme aşaması rozetleri — bağımsız renkler değil, tek hue üzerinde sıralı
// bir rampa: yeni (açık) -> olgun (koyu).
export const STATUS_LABELS = {
  new: 'Yeni',
  learning: 'Öğreniliyor',
  young: 'Genç',
  mature: 'Olgun',
};

export function stageColor(status, mode) {
  const ramp = mode === 'dark' ? STAGE.dark : STAGE.light;
  return ramp[status] || ramp.new;
}

export function stageMeta(status, mode) {
  return {
    label: STATUS_LABELS[status] || STATUS_LABELS.new,
    color: stageColor(status, mode),
  };
}
