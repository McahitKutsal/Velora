'use client';

import { useMemo, useState } from 'react';
import { Box, Popover, Typography, CircularProgress } from '@mui/material';
import SpeakButton from '@/components/SpeakButton';

// Aynı kelime tekrar tıklanınca dış servise gitmemek için istemci önbelleği.
const cache = new Map();

async function translateWord(q, from, to) {
  const key = `${from}|${to}|${q.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, from, to }),
  });
  const data = await res.json();
  const val = res.ok ? data.translation : null;
  cache.set(key, val);
  return val;
}

// Metni kelimelere ayırır; harf içeren parçalar tıklanabilir, boşluk/noktalama korunur.
function tokenize(text) {
  const out = [];
  const re = /(\p{L}[\p{L}\p{M}'’-]*)/gu;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ word: false, t: text.slice(last, m.index) });
    out.push({ word: true, t: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ word: false, t: text.slice(last) });
  return out;
}

// Kelimeye tıklanınca çevirisini küçük bir baloncukta gösteren metin bileşeni.
export default function ClickableWords({ text, from = 'ru', to = 'tr', lang = 'ru-RU' }) {
  const [anchor, setAnchor] = useState(null);
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState(null);
  const [loading, setLoading] = useState(false);

  const tokens = useMemo(() => tokenize(text || ''), [text]);

  const handleWordClick = async (e, w) => {
    e.stopPropagation(); // kartın çevrilmesini engelle
    setAnchor(e.currentTarget);
    setWord(w);
    setTranslation(null);
    setLoading(true);
    const result = await translateWord(w, from, to);
    setTranslation(result);
    setLoading(false);
  };

  const close = () => setAnchor(null);

  return (
    <>
      {tokens.map((tok, i) =>
        tok.word ? (
          <Box
            key={i}
            component="span"
            onClick={(e) => handleWordClick(e, tok.t)}
            sx={{
              cursor: 'pointer',
              borderRadius: 0.5,
              transition: 'background-color 0.12s',
              '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
            }}
          >
            {tok.t}
          </Box>
        ) : (
          <span key={i}>{tok.t}</span>
        )
      )}

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ px: 2, py: 1.25, minWidth: 160, maxWidth: 280 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {word}
            </Typography>
            <SpeakButton text={word} lang={lang} />
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <CircularProgress size={14} />
              <Typography variant="body2" color="text.secondary">
                Çevriliyor…
              </Typography>
            </Box>
          ) : translation ? (
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              {translation}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Çeviri bulunamadı
            </Typography>
          )}
        </Box>
      </Popover>
    </>
  );
}
