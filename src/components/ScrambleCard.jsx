'use client';

import { useMemo } from 'react';
import { Box, Card, Typography, IconButton, Tooltip } from '@mui/material';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SpeakButton from '@/components/SpeakButton';
import { scrambleLetters } from '@/lib/studyActivities';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Yerleştirilen harf kutusu / boş slot.
function Slot({ children, empty, onClick, tone }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        minWidth: { xs: 30, sm: 36 },
        height: { xs: 40, sm: 46 },
        px: 0.5,
        borderRadius: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: { xs: '1.1rem', sm: '1.25rem' },
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        border: '2px solid',
        borderColor: empty ? 'divider' : tone || 'primary.main',
        borderStyle: empty ? 'dashed' : 'solid',
        bgcolor: empty ? 'transparent' : 'action.hover',
        color: tone || 'text.primary',
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Harfleri dizerek kelimeyi kurma aktivitesi. Kurulan metin `value` ile
 * yukarıda tutulur; taş havuzu bu metinden türetilir (tek kaynak).
 */
export default function ScrambleCard({
  target,
  meaning,
  value,
  onChange,
  language,
  answered,
  verdict,
  color,
}) {
  const letters = useMemo(() => scrambleLetters(target), [target]);
  const tiles = useMemo(
    () => shuffle(letters.map((ch, i) => ({ id: i, ch }))),
    [letters]
  );

  // Kurulan metnin harflerini sırayla havuzdaki ilk uygun taşa eşleyip
  // hangi taşların tükendiğini buluruz (aynı harf birden çok olabilir).
  const usedIds = useMemo(() => {
    const used = new Set();
    for (const ch of Array.from(value || '')) {
      const tile = tiles.find((t) => !used.has(t.id) && t.ch === ch);
      if (tile) used.add(tile.id);
    }
    return used;
  }, [tiles, value]);

  const placed = Array.from(value || '');
  const remaining = Math.max(0, letters.length - placed.length);
  const tone = answered ? (verdict === 'correct' ? 'success.main' : 'error.main') : undefined;

  return (
    <Card sx={{ borderTop: `4px solid ${color}`, p: { xs: 2.5, sm: 3 } }}>
      <Typography variant="overline" color="text.secondary">
        Kelimeyi kur
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        {meaning}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {language.label} karşılığını harfleri dizerek yaz
      </Typography>

      {/* Kurulan kelime */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 2, minHeight: 46 }}>
        {placed.map((ch, i) => (
          <Slot
            key={`p${i}`}
            tone={tone}
            onClick={answered ? undefined : () => onChange(placed.slice(0, i).concat(placed.slice(i + 1)).join(''))}
          >
            {ch}
          </Slot>
        ))}
        {Array.from({ length: remaining }).map((_, i) => (
          <Slot key={`e${i}`} empty />
        ))}
        {placed.length > 0 && !answered && (
          <Tooltip title="Son harfi geri al">
            <IconButton size="small" onClick={() => onChange(placed.slice(0, -1).join(''))} aria-label="Son harfi geri al">
              <BackspaceOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Harf havuzu */}
      {!answered && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 2 }}>
          {tiles.map((t) => {
            const used = usedIds.has(t.id);
            return (
              <Box
                key={t.id}
                component="button"
                type="button"
                disabled={used}
                onClick={() => onChange((value || '') + t.ch)}
                sx={{
                  minWidth: { xs: 34, sm: 40 },
                  height: { xs: 42, sm: 48 },
                  px: 0.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  fontWeight: 600,
                  cursor: used ? 'default' : 'pointer',
                  visibility: used ? 'hidden' : 'visible',
                  transition: 'transform 0.08s ease, background-color 0.12s ease',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:active': { transform: 'translateY(1px)' },
                }}
              >
                {t.ch}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Cevap */}
      {answered && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          {verdict === 'correct' ? (
            <CheckCircleIcon sx={{ color: 'success.main' }} />
          ) : (
            <CancelIcon sx={{ color: 'error.main' }} />
          )}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {target}
          </Typography>
          <SpeakButton text={target} lang={language.speech} />
        </Box>
      )}
    </Card>
  );
}
