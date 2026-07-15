// Shared UI constants for the flashcards module (client + pages).

export const DECK_COLORS = [
  '#4da8da', '#22c55e', '#f59e0b', '#f43f5e',
  '#a855f7', '#06b6d4', '#ec4899', '#64748b',
];

// Learning-stage badge metadata, keyed by the status derived in lib/srs.js.
export const STATUS_META = {
  new: { label: 'Yeni', color: '#22c55e' },
  learning: { label: 'Öğreniliyor', color: '#f59e0b' },
  young: { label: 'Genç', color: '#4da8da' },
  mature: { label: 'Olgun', color: '#a855f7' },
};
