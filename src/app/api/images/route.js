import { NextResponse } from 'next/server';

// Kelimeye göre arka plan görseli önerileri — Openverse (ücretsiz, API key yok).
// Arama İngilizce'de çok daha isabetli olduğu için önce kelimeyi en'e çeviririz.

const cache = new Map();

async function toEnglish(text, from) {
  if (!text || from === 'en') return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=en&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return text;
    const data = await res.json();
    const chunks = Array.isArray(data?.[0]) ? data[0] : [];
    const out = chunks.map((c) => c?.[0] || '').join('').trim();
    return out || text;
  } catch {
    return text;
  }
}

async function searchOpenverse(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
    query
  )}&page_size=12&mature=false`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Velora/1.0 (flashcards)' } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.results || [])
    .filter((r) => r.thumbnail)
    .map((r) => ({ id: r.id, thumb: r.thumbnail, title: r.title || '' }));
}

export async function POST(req) {
  try {
    const { q, from = 'ru' } = await req.json();
    const text = (q || '').trim();
    if (!text) return NextResponse.json({ error: 'q required' }, { status: 400 });

    const key = `${from}|${text.toLowerCase()}`;
    if (cache.has(key)) return NextResponse.json(cache.get(key));

    const query = await toEnglish(text, from);
    const results = await searchOpenverse(query);
    const payload = { query, results };
    cache.set(key, payload);
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
