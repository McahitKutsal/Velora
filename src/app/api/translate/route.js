import { NextResponse } from 'next/server';

// Kelime bazlı çeviri — ücretsiz, API key gerektirmez.
// Birincil kaynak Google'ın açık çeviri ucu (tek kelimede temiz sonuç),
// erişilemezse MyMemory'ye düşülür. Sunucuda proxy + cache.

const cache = new Map();

// Google'ın anahtarsız çeviri ucu. Yanıt: [[[çeviri, kaynak, ...], ...], ...]
async function viaGoogle(text, from, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(
    text
  )}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  const chunks = Array.isArray(data?.[0]) ? data[0] : [];
  const out = chunks.map((c) => c?.[0] || '').join('').trim();
  return out || null;
}

// MyMemory yedeği. Birincil sonuç bazen çöp döner; en iyi eşleşmeyi seç.
async function viaMyMemory(text, from, to) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  const junk = (t) => !t || t.includes('>>') || t.trim().toLowerCase() === text.toLowerCase();
  const matches = Array.isArray(data?.matches) ? data.matches : [];
  const best = matches
    .map((m) => ({ t: (m.translation || '').trim(), score: Number(m.quality) * (Number(m.match) || 1) }))
    .filter((m) => !junk(m.t) && m.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  if (best) return best.t;
  const primary = data?.responseData?.translatedText?.trim();
  return junk(primary) ? null : primary;
}

export async function POST(req) {
  try {
    const { q, from = 'ru', to = 'tr' } = await req.json();
    const text = (q || '').trim();
    if (!text) return NextResponse.json({ error: 'q required' }, { status: 400 });

    const key = `${from}|${to}|${text.toLowerCase()}`;
    if (cache.has(key)) return NextResponse.json({ translation: cache.get(key), cached: true });

    let translation = null;
    try {
      translation = await viaGoogle(text, from, to);
    } catch {
      /* yedeğe düş */
    }
    if (!translation) translation = await viaMyMemory(text, from, to);

    if (!translation) return NextResponse.json({ error: 'translation failed' }, { status: 502 });

    cache.set(key, translation);
    return NextResponse.json({ translation });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
