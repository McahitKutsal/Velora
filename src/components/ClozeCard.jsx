'use client';

import { useEffect, useState } from 'react';
import { Box, Card, Typography, CircularProgress, Button, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ClickableWords from '@/components/ClickableWords';
import SpeakButton from '@/components/SpeakButton';
import { fetchExample } from '@/lib/examples';
import { buildCloze } from '@/lib/cloze';

/**
 * Kartın kelimesi için örnek cümle çekip boşluklu hâlini hazırlar.
 * `enabled` false iken hiç istek atmaz. Cümle bulunamazsa (ya da kelime
 * cümlede yakalanamazsa) { loading: false, cloze: null } döner — çağıran
 * taraf bunu görüp başka bir aktiviteye düşer.
 */
export function useCloze(card, lang, enabled) {
  const [state, setState] = useState({ loading: Boolean(enabled), cloze: null });

  useEffect(() => {
    if (!enabled || !card?.front?.trim()) {
      setState({ loading: false, cloze: null });
      return undefined;
    }
    let alive = true;
    setState({ loading: true, cloze: null });
    fetchExample(card.front, lang).then((example) => {
      if (!alive) return;
      const cloze = example?.text ? buildCloze(example.text, card.front) : null;
      setState({
        loading: false,
        cloze: cloze ? { ...cloze, translation: example.tr || null } : null,
      });
    });
    return () => {
      alive = false;
    };
  }, [card?.id, card?.front, lang, enabled]);

  return state;
}

// Boşluk: cevaplanmadan önce alt çizgi (ipucu açıksa ilk harf görünür).
function Blank({ length, hint }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        minWidth: Math.max(48, length * 12),
        mx: 0.5,
        px: 0.75,
        textAlign: 'center',
        borderBottom: '2px solid',
        borderColor: 'primary.main',
        color: 'primary.main',
        fontWeight: 700,
        letterSpacing: '0.15em',
      }}
    >
      {hint ? `${hint}…` : ' '}
    </Box>
  );
}

export default function ClozeCard({ cloze, loading, card, language, answered, verdict, color }) {
  const [hint, setHint] = useState(false);

  if (loading || !cloze) {
    return (
      <Card sx={{ borderTop: `4px solid ${color}`, p: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Örnek cümle hazırlanıyor…
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ borderTop: `4px solid ${color}`, p: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="overline" color="text.secondary">
          Boşluğu doldur
        </Typography>
        {answered && (
          verdict === 'correct' ? (
            <CheckCircleIcon sx={{ color: 'success.main' }} />
          ) : (
            <CancelIcon sx={{ color: 'error.main' }} />
          )
        )}
      </Box>

      {/* Cümle */}
      <Typography variant="h6" sx={{ fontWeight: 500, lineHeight: 1.7, mt: 0.5 }}>
        <ClickableWords text={cloze.before} lang={language.code} />
        {answered ? (
          <Box component="span" sx={{ fontWeight: 800, color: verdict === 'correct' ? 'success.main' : 'error.main' }}>
            {cloze.answer}
          </Box>
        ) : (
          <Blank length={cloze.answer.length} hint={hint ? cloze.answer.slice(0, 1) : null} />
        )}
        <ClickableWords text={cloze.after} lang={language.code} />
      </Typography>

      {/* Aranan kelimenin Türkçesi — hangi kelimeyi yazacağını bilsin diye */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
        <Chip size="small" variant="outlined" label={card.back} />
        {!answered && !hint && (
          <Button size="small" startIcon={<LightbulbOutlinedIcon />} onClick={() => setHint(true)}>
            İpucu
          </Button>
        )}
      </Box>

      {/* Cevaptan sonra: tam cümle + çevirisi + seslendirme */}
      {answered && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {cloze.sentence}
            </Typography>
            <SpeakButton text={cloze.sentence} lang={language.speech} sx={{ p: 0.25 }} />
          </Box>
          {cloze.translation && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {cloze.translation}
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
}
