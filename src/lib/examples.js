// Örnek cümleleri /api/examples üzerinden çeker.
// Aynı kelime hem "örnek cümle" kutusunda hem de boşluk doldurma
// aktivitesinde kullanılabildiği için sonucu (promise olarak) önbelleğe
// alırız — böylece eşzamanlı iki istek tek ağ çağrısına düşer.

const cache = new Map();

export function fetchExample(word, lang) {
  const text = (word || '').trim();
  if (!text) return Promise.resolve(null);

  const key = `${lang}|${text.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);

  const promise = (async () => {
    try {
      const res = await fetch('/api/examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, lang }),
      });
      const data = await res.json();
      return res.ok ? data.example : null;
    } catch {
      return null;
    }
  })();

  cache.set(key, promise);
  return promise;
}
