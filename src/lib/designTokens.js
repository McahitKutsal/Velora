// Velora görsel kimliği — tek kaynak.
//
// Yön: sıcak nötr taban (taş/kum) + derin indigo aksan. Sıcak zeminle soğuk
// aksan arasındaki gerilim uygulamaya karakterini veren şey; bu yüzden nötrler
// mavimsi gri DEĞİL.
//
// Veri renkleri (kategorik palet, öğrenme aşaması rampası, durum renkleri)
// dataviz doğrulayıcısından geçirildi: her iki modda da açıklık bandı, kroma
// tabanı, renk körlüğü ayrımı ve normal görüş tabanı PASS.

/* ---------------------------------------------------------------- */
/* Nötrler — sıcak taş                                               */
/* ---------------------------------------------------------------- */

export const NEUTRAL = {
  light: {
    plane: '#f7f6f3',   // sayfa zemini
    surface: '#ffffff', // kart yüzeyi
    sunken: '#f2f0ec',  // içe gömülü alanlar (input, klavye, boş slot)
    ink: '#1a1917',
    inkMuted: '#6b6862',
    inkFaint: '#94908a',
    border: 'rgba(26, 25, 23, 0.10)',
    borderStrong: 'rgba(26, 25, 23, 0.16)',
    hover: 'rgba(26, 25, 23, 0.04)',
  },
  dark: {
    plane: '#131211',
    surface: '#1c1a18',
    sunken: '#232120',
    ink: '#f5f3ef',
    inkMuted: '#a8a49c',
    inkFaint: '#7c7871',
    border: 'rgba(255, 255, 255, 0.10)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
    hover: 'rgba(255, 255, 255, 0.05)',
  },
};

/* ---------------------------------------------------------------- */
/* Marka aksanı — derin indigo                                       */
/* ---------------------------------------------------------------- */
// Kasıtlı olarak kategorik paletteki seri mavisinden farklı bir hue:
// arayüz kromu ile veri serileri birbirine karışmasın.

export const BRAND = {
  light: { main: '#4a3aa7', light: '#6f5fd0', dark: '#372a80', contrastText: '#ffffff' },
  dark: { main: '#9085e9', light: '#b0a7f2', dark: '#6f5fd0', contrastText: '#131211' },
};

/* ---------------------------------------------------------------- */
/* Kategorik veri paleti — sabit sıra, asla döngüye sokulmaz          */
/* ---------------------------------------------------------------- */

export const CATEGORICAL = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

// Deste renkleri veritabanında hex olarak saklandığı için mod bağımsız tek bir
// değer gerekiyor: açık moddaki hex kanonik kabul edilir, koyu modda karşılığına
// çevrilir (bkz. resolveDeckColor). Marka indigosu listede yok — deste rengi
// arayüz aksanıyla karışmasın.
export const DECK_SLOTS = [0, 1, 2, 3, 4, 5, 7];

/* ---------------------------------------------------------------- */
/* Öğrenme aşamaları — tek hue, sıralı rampa                         */
/* ---------------------------------------------------------------- */
// Aşamalar bağımsız kategoriler değil, bir ilerleme: açıktan koyuya.

export const STAGE = {
  light: { new: '#86b6ef', learning: '#5598e7', young: '#2a78d6', mature: '#184f95' },
  dark: { new: '#9ec5f4', learning: '#5598e7', young: '#2a78d6', mature: '#184f95' },
};

/* ---------------------------------------------------------------- */
/* Durum renkleri — sabit, seri rengi olarak asla kullanılmaz         */
/* ---------------------------------------------------------------- */

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

// Yükseliş/düşüş metni (para birimi ve kâr/zarar için okunabilir tonlar).
export const DELTA = {
  light: { up: '#006300', down: '#b3282d' },
  dark: { up: '#0ca30c', down: '#e66767' },
};

/* ---------------------------------------------------------------- */
/* Değerlendirme butonları — durum paletinden türetilir               */
/* ---------------------------------------------------------------- */

export const RATING = {
  light: { again: '#d03b3b', hard: '#c2760a', good: '#2a78d6', easy: '#0ca30c' },
  dark: { again: '#e66767', hard: '#fab219', good: '#3987e5', easy: '#0ca30c' },
};

/* ---------------------------------------------------------------- */
/* Grafik kromu                                                      */
/* ---------------------------------------------------------------- */

export const CHART = {
  light: { grid: '#e7e4de', axis: '#c9c5bd', label: '#94908a' },
  dark: { grid: '#2c2a28', axis: '#3a3835', label: '#7c7871' },
};

/* ---------------------------------------------------------------- */
/* Ölçekler                                                          */
/* ---------------------------------------------------------------- */

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 };

export function tokens(mode) {
  const isDark = mode === 'dark';
  const key = isDark ? 'dark' : 'light';
  return {
    isDark,
    neutral: NEUTRAL[key],
    brand: BRAND[key],
    categorical: CATEGORICAL[key],
    stage: STAGE[key],
    status: STATUS,
    delta: DELTA[key],
    rating: RATING[key],
    chart: CHART[key],
  };
}
