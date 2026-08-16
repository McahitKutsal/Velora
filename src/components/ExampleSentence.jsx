'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import ClickableWords from '@/components/ClickableWords';
import SpeakButton from '@/components/SpeakButton';
import { getLanguage } from '@/lib/languages';
import { fetchExample } from '@/lib/examples';

// Bir yabancı kelime için örnek cümle gösterir (kelimeler tıklanabilir + seslendirme).
export default function ExampleSentence({ word, lang }) {
  const [loading, setLoading] = useState(true);
  const [example, setExample] = useState(null);
  const language = getLanguage(lang);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setExample(null);
    if (!word?.trim()) {
      setLoading(false);
      return undefined;
    }
    fetchExample(word.trim(), language.code).then((ex) => {
      if (!alive) return;
      setExample(ex);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [word, language.code]);

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
            <ClickableWords text={example.text} lang={language.code} />
          </Typography>
          <SpeakButton text={example.text} lang={language.speech} sx={{ p: 0.25 }} />
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
