// Desteklenen hedef diller. Her deste bir dile bağlıdır (decks.lang) ve
// klavye / seslendirme / çeviri / örnek cümle ayarları buradan türetilir.

export const LANGUAGES = {
  ru: {
    code: 'ru',
    label: 'Rusça',
    short: 'RU',
    flag: '🇷🇺',
    speech: 'ru-RU',       // Web Speech API sesi
    locale: 'ru-RU',       // büyük/küçük harf dönüşümü
    tatoeba: 'rus',        // örnek cümle kaynağı dil kodu
    keyboardTag: 'РУ',
    keyboardLabel: 'Rusça klavye',
    // Standart ЙЦУКЕН dizilimi.
    rows: [
      ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
      ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
      ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', 'ё'],
    ],
  },
  de: {
    code: 'de',
    label: 'Almanca',
    short: 'DE',
    flag: '🇩🇪',
    speech: 'de-DE',
    locale: 'de-DE',
    tatoeba: 'deu',
    keyboardTag: 'DE',
    keyboardLabel: 'Almanca klavye',
    // QWERTZ dizilimi — asıl faydası ä/ö/ü/ß tuşları.
    rows: [
      ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
      ['y', 'x', 'c', 'v', 'b', 'n', 'm', 'ß'],
    ],
  },
};

export const DEFAULT_LANG = 'ru';

// Deste/kart dilini normalize eder; bilinmeyen veya boş değer varsayılana düşer.
export function getLanguage(code) {
  return LANGUAGES[code] || LANGUAGES[DEFAULT_LANG];
}

export const LANGUAGE_LIST = Object.values(LANGUAGES);
