'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

// Kelimeye göre Openverse'ten görsel önerileri getirip seçtiren bileşen.
// Arama terimi düzenlenebilir (çeviri hatalıysa elle düzelt) ve "Daha fazla"
// ile sonraki sayfadan farklı görseller yüklenir.
export default function CardImagePicker({ word, value, onChange, from = 'ru' }) {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  // params: { q, raw, page, append }
  const fetchImages = async ({ q, raw, page: pageNum, append }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, from, page: pageNum, raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError('Arama başarısız oldu.');
        return;
      }
      const incoming = data.results || [];
      setQuery(data.query || q); // çözülen (çevrilmiş) terimi kutuya yaz
      setPage(data.page || pageNum);
      setHasMore(Boolean(data.hasMore));
      setResults((prev) => {
        if (!append) return incoming;
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...incoming.filter((r) => !seen.has(r.id))];
      });
      if (!append && incoming.length === 0) setError('Görsel bulunamadı, terimi değiştirip dene.');
    } catch {
      setError('Arama başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  // İlk arama: kartın kelimesini çevir ve ara.
  const startSearch = () => {
    const q = (word || '').trim();
    if (!q) {
      setOpen(true);
      setError('Önce ön yüze bir kelime yaz.');
      return;
    }
    setOpen(true);
    setResults([]);
    fetchImages({ q, raw: false, page: 1, append: false });
  };

  // Kutudaki terimle yeniden ara (çeviri yok, olduğu gibi).
  const searchTyped = () => {
    const q = query.trim();
    if (!q) return;
    setResults([]);
    fetchImages({ q, raw: true, page: 1, append: false });
  };

  const loadMore = () => {
    const q = query.trim();
    if (!q) return;
    fetchImages({ q, raw: true, page: page + 1, append: true });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" startIcon={<ImageSearchIcon />} onClick={startSearch}>
          {value ? 'Görseli değiştir' : 'Görsel bul'}
        </Button>
        {value && (
          <Box sx={{ position: 'relative', width: 64, height: 44 }}>
            <Box
              component="img"
              src={value}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
            />
            <IconButton
              size="small"
              onClick={() => onChange(null)}
              aria-label="Görseli kaldır"
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                p: 0.25,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {open && (
        <Box sx={{ mt: 1.5 }}>
          {/* Düzenlenebilir arama kutusu — çeviri alakasızsa elle düzelt */}
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchTyped())}
            placeholder="Arama terimi (İngilizce en iyi sonucu verir)"
            size="small"
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={searchTyped} aria-label="Ara" edge="end">
                      <SearchIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 1.5 }}
          />

          {error && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {error}
            </Typography>
          )}

          {results.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                gap: 1,
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              {results.map((r) => {
                const selected = value === r.thumb;
                return (
                  <Box
                    key={r.id}
                    component="img"
                    src={r.thumb}
                    alt={r.title}
                    loading="lazy"
                    onClick={() => {
                      onChange(r.thumb);
                      setOpen(false);
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    sx={{
                      width: '100%',
                      height: 64,
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selected ? 'primary.main' : 'transparent',
                      transition: 'transform 0.12s, border-color 0.12s',
                      '&:hover': { transform: 'scale(1.04)', borderColor: 'primary.light' },
                    }}
                  />
                );
              })}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
            {loading && <CircularProgress size={18} />}
            {loading && (
              <Typography variant="body2" color="text.secondary">
                Görseller aranıyor…
              </Typography>
            )}
            {!loading && hasMore && results.length > 0 && (
              <Button size="small" onClick={loadMore}>
                Daha fazla göster
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
