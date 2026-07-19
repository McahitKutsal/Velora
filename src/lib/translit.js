// Rusça (Kiril) metni Latin okunuşa çevirir — telaffuz yardımı içindir, resmî
// bir romanizasyon standardı değil, Türk kullanıcıya sezgisel gelecek şekilde ayarlı.

const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'ye', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ç', ш: 'ş', щ: 'şç',
  ъ: '', ы: 'ı', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function mapChar(ch) {
  const lower = ch.toLowerCase();
  const mapped = MAP[lower];
  if (mapped === undefined) return ch; // Kiril değilse aynen bırak
  if (ch === lower || !mapped) return mapped;
  // Büyük harfti: ilk karakteri büyüt (ör. Ш -> Ş, Ю -> Yu).
  return mapped.charAt(0).toUpperCase() + mapped.slice(1);
}

// Metni Latin okunuşa çevirir. İçinde hiç Kiril yoksa null döner (gösterme).
export function transliterate(text) {
  if (!text) return null;
  if (!/[Ѐ-ӿ]/.test(text)) return null;
  let out = '';
  for (const ch of text) out += mapChar(ch);
  return out;
}
