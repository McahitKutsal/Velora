import { NextResponse } from 'next/server';
import { getLanguage } from '@/lib/languages';

// Bir yabancı kelime için örnek cümle — Tatoeba (ücretsiz, API key yok).
// Cümleyi ve varsa Türkçe çevirisini döndürür. Türkçe çeviri Tatoeba'da
// "dolaylı" olarak translations[1] içinde de gelebilir.

const cache = new Map();

function pickTranslation(result) {
  const groups = Array.isArray(result?.translations) ? result.translations : [];
  for (const group of groups) {
    for (const t of group || []) {
      if (t?.text) return t.text;
    }
  }
  return null;
}

export async function POST(req) {
  try {
    const { q, lang } = await req.json();
    const text = (q || '').trim();
    if (!text) return NextResponse.json({ error: 'q required' }, { status: 400 });

    const language = getLanguage(lang);
    const key = `${language.code}|${text.toLowerCase()}`;
    if (cache.has(key)) return NextResponse.json(cache.get(key));

    const url = `https://tatoeba.org/en/api_v0/search?from=${language.tatoeba}&to=tur&query=${encodeURIComponent(
      text
    )}&trans_filter=limit&sort=relevance`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Velora/1.0 (flashcards)' } });
    if (!res.ok) return NextResponse.json({ example: null });

    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    // Türkçe çevirisi olan ilk (en kısa, öğrenmesi kolay) cümleyi seç.
    const withTr = results
      .map((r) => ({ text: r.text, tr: pickTranslation(r) }))
      .filter((r) => r.text && r.tr)
      .sort((a, b) => a.text.length - b.text.length);
    const best = withTr[0] || (results[0]?.text ? { text: results[0].text, tr: null } : null);

    const payload = { example: best };
    cache.set(key, payload);
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
