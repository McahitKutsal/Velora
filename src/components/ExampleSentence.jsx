'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import ClickableWords from '@/components/ClickableWords';
import SpeakButton from '@/components/SpeakButton';

// Aynı kelime için tekrar ağ isteği atmamak üzere basit önbellek.
const cache = new Map();

async function fetchExample(word) {
  const key = word.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  try {
    const res = await fetch('/api/examples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: word }),
    });
    const data = await res.json();
    const val = res.ok ? data.example : null;
    cache.set(key, val);
    return val;
  } catch {
    return null;
  }
}

// Bir Rusça kelime için örnek cümle gösterir (kelimeler tıklanabilir + seslendirme).
export default function ExampleSentence({ word }) {
  const [loading, setLoading] = useState(true);
  const [example, setExample] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setExample(null);
    if (!word?.trim()) {
      setLoading(false);
      return undefined;
    }
    fetchExample(word.trim()).then((ex) => {
      if (!alive) return;
      setExample(ex);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [word]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary">
          Örnek cümle aranıyor…
        </Typography>
      </Box>
    );
  }

  if (!example) return null;

  return (
    <Box
      sx={{
        mt: 2,
        pl: 1.5,
        borderLeft: '3px solid',
        borderColor: 'divider',
        display: 'flex',
        gap: 0.75,
      }}
    >
      <FormatQuoteRoundedIcon sx={{ color: 'text.disabled', fontSize: 18, mt: 0.25, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            <ClickableWords text={example.ru} />
          </Typography>
          <SpeakButton text={example.ru} sx={{ p: 0.25 }} />
        </Box>
        {example.tr && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {example.tr}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
