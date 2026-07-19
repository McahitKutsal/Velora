'use client';

import { useState } from 'react';
import { Box, Button, Typography, CircularProgress, IconButton } from '@mui/material';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import CloseIcon from '@mui/icons-material/Close';

// Kelimeye göre Openverse'ten görsel önerileri getirip seçtiren bileşen.
// `word` genelde kartın ön yüzü (Rusça); route ru→en çevirip arar.
export default function CardImagePicker({ word, value, onChange, from = 'ru' }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  const search = async () => {
    const q = (word || '').trim();
    if (!q) {
      setError('Önce ön yüze bir kelime yaz.');
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, from }),
      });
      const data = await res.json();
      setResults(res.ok ? data.results || [] : []);
      if (!res.ok || !(data.results || []).length) setError('Görsel bulunamadı, başka kelime dene.');
    } catch {
      setError('Arama başarısız oldu.');
    }
    setLoading(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" startIcon={<ImageSearchIcon />} onClick={search}>
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
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Görseller aranıyor…
              </Typography>
            </Box>
          ) : error ? (
            <Typography variant="body2" color="text.secondary">
              {error}
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                gap: 1,
                maxHeight: 220,
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
        </Box>
      )}
    </Box>
  );
}
