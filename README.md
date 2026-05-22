# Velora

Yatırım ve görev takip uygulaması. Next.js 15 (App Router) + Material UI 7 + libSQL/SQLite (Turso) ile yazıldı.

## Özellikler

- **Dashboard:** Toplam maliyet, güncel değer, kâr/zarar, varlık dağılımı (pie), portföy zaman çizelgesi (area), kâr/zarar bar grafik, günlük değişim, en çok kazandıran/kaybettiren ilk 3.
- **Yatırımlar:** Çoklu pozisyon (lot) takibi, sürükle-bırak sıralama, 60 sn'de bir otomatik fiyat yenileme, BIST + US hisse + kripto + altın + gümüş + döviz, tarihsel fiyat otomatik doldurma.
- **Yapılacaklar:** Öncelik, kategori, son tarih, optimistic toggle.
- **Ayarlar:** Karanlık mod (kalıcı), para birimi (TRY/USD/EUR), Google profili, çıkış.
- **Auth:** Google OAuth + JWT (localStorage).
- **DB:** Lokal `file:` veya Turso (libSQL). Schema ilk çalıştırmada otomatik oluşur.

## Lokal Kurulum

```bash
npm install
cp .env.example .env
# .env içindeki GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_CLIENT_ID, JWT_SECRET doldur
npm run dev
```

`http://localhost:3000` aç. Veritabanı ilk çalıştırmada `./data/velora.db` olarak oluşturulur (TURSO_DATABASE_URL set edilmemişse).

## Vercel + Turso Deploy

Vercel'in serverless dosya sistemi read-only olduğundan SQLite dosyası kullanılamaz. Turso (libSQL) ile aynı SQL uyumluluğu korunur.

### 1) Turso DB oluştur

```bash
# Turso CLI kur
curl -sSfL https://get.tur.so/install.sh | bash

# Giriş yap
turso auth signup   # veya: turso auth login

# DB oluştur
turso db create velora

# Bağlantı URL'i
turso db show velora --url
# çıktı: libsql://velora-<org>.turso.io

# Auth token oluştur (uzun ömürlü)
turso db tokens create velora
# çıktı: ey...
```

### 2) Vercel'e bağla

1. https://vercel.com/new → GitHub repo'sunu (Velora) seç.
2. **Environment Variables** bölümünde şunları ekle:
   - `GOOGLE_CLIENT_ID` — Google OAuth Client ID
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — aynı değer
   - `JWT_SECRET` — uzun rastgele string
   - `TURSO_DATABASE_URL` — `libsql://...turso.io`
   - `TURSO_AUTH_TOKEN` — Turso token'ı
3. **Deploy**.

### 3) Google OAuth origin'i ekle

Deploy sonrası aldığın Vercel URL'sini (örn. `https://velora.vercel.app`) Google Cloud Console'da OAuth client'a **Authorized JavaScript origins** olarak ekle. Custom domain kullanacaksan onu da ekle.

## Environment Değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ✓ | Sunucu tarafı token doğrulaması |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ✓ | İstemci sign-in butonu (aynı değer) |
| `JWT_SECRET` | ✓ | Session JWT imza anahtarı |
| `TURSO_DATABASE_URL` | prod | libsql:// URL — production için Turso |
| `TURSO_AUTH_TOKEN` | prod | Turso DB token |
| `DATABASE_PATH` | – | Lokal SQLite dosya yolu (varsayılan `./data/velora.db`) |

## Yapı

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # Server route handlers
│   │   ├── auth/           # Google OAuth -> JWT
│   │   ├── investments/    # CRUD
│   │   ├── todos/          # CRUD
│   │   ├── todos-toggle/   # Tamamlandı toggle
│   │   └── fetch-url/      # Yahoo Finance proxy (CORS bypass)
│   ├── investments/        # /investments
│   ├── todos/              # /todos
│   ├── settings/           # /settings
│   ├── login/              # /login
│   ├── layout.jsx
│   └── page.jsx            # Dashboard /
├── components/             # AppShell, Layout, Sidebar, settings ctx
├── contexts/               # AuthContext
├── lib/                    # db (libSQL), auth (JWT), apiClient, repo/*
├── services/               # priceService (Yahoo via /api/fetch-url proxy)
├── stores/                 # Zustand investment/todo
├── utils/                  # currency
└── theme.js
```
