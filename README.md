# Velora

Yatırım ve görev takip uygulaması. Next.js 15 (App Router) + Material UI 7 + SQLite (better-sqlite3) ile yazıldı.

## Özellikler

- **Dashboard:** Toplam maliyet, güncel değer, kâr/zarar, varlık dağılımı (pie), portföy zaman çizelgesi (area), kâr/zarar bar grafik, günlük değişim, en çok kazandıran/kaybettiren ilk 3.
- **Yatırımlar:** Çoklu pozisyon (lot) takibi, sürükle-bırak sıralama, 60 sn'de bir otomatik fiyat yenileme, BIST + US hisse + kripto + altın + gümüş + döviz, tarihsel fiyat otomatik doldurma.
- **Yapılacaklar:** Öncelik, kategori, son tarih, optimistic toggle.
- **Ayarlar:** Karanlık mod (kalıcı), para birimi (TRY/USD/EUR), Google profili, çıkış.
- **Auth:** Google OAuth + JWT (localStorage).
- **DB:** Yerel SQLite dosyası (`data/velora.db`), WAL mode.

## Kurulum

```bash
npm install
cp .env.example .env
# .env dosyasına GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_CLIENT_ID, JWT_SECRET ekle
npm run dev
```

Tarayıcıdan `http://localhost:3000` adresini aç. Veritabanı ilk çalıştırmada `data/velora.db` olarak otomatik oluşturulur.

## Environment Değişkenleri

| Değişken | Açıklama |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (sunucu doğrulaması) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Aynı ID, istemci tarafı için |
| `JWT_SECRET` | JWT imzalama için uzun rastgele dize |
| `DATABASE_PATH` | (opsiyonel) SQLite dosya yolu, varsayılan `./data/velora.db` |

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
├── lib/                    # db, auth, apiClient, repo/*
├── services/               # priceService (Yahoo)
├── stores/                 # Zustand investment/todo
├── utils/                  # currency
└── theme.js
```
