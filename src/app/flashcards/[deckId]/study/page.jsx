'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  IconButton,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Chip,
  CircularProgress,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CelebrationIcon from '@mui/icons-material/Celebration';
import FlipIcon from '@mui/icons-material/Flip';
import QuizIcon from '@mui/icons-material/Quiz';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import useFlashcardStore from '@/stores/flashcardStore';
import CyrillicKeyboard from '@/components/CyrillicKeyboard';
import { RATINGS, RATING_META, previewIntervals, formatInterval } from '@/lib/srs';

/* ------------------------- helpers ------------------------- */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s) {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '');
}

function isTypedCorrect(typed, back) {
  const answers = back.split(/[/,]/).map(normalize).filter(Boolean);
  const guess = normalize(typed);
  return answers.includes(guess);
}

function buildOptions(current, pool) {
  const seen = new Set([current.back]);
  const distractors = [];
  for (const p of shuffle(pool)) {
    if (distractors.length >= 3) break;
    if (seen.has(p.back)) continue;
    seen.add(p.back);
    distractors.push(p.back);
  }
  return shuffle([current.back, ...distractors]);
}

/* ------------------------- flip card ------------------------- */

function FlipCard({ front, back, notes, flipped, color, onClick }) {
  return (
    <Box sx={{ perspective: '1600px', width: '100%', cursor: 'pointer' }} onClick={onClick}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          minHeight: { xs: 240, sm: 300 },
          transformStyle: 'preserve-3d',
          transition: 'transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <Card
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            borderTop: `4px solid ${color}`,
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ position: 'absolute', top: 14, left: 18 }}>
            Soru
          </Typography>
          <Typography variant="h5" align="center" sx={{ whiteSpace: 'pre-wrap', fontWeight: 600 }}>
            {front}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ position: 'absolute', bottom: 12 }}>
            Cevabı görmek için tıkla ya da Boşluk'a bas
          </Typography>
        </Card>

        {/* Back */}
        <Card
          sx={{
            position: 'absolute',
            inset: 0,
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            borderTop: `4px solid ${color}`,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ position: 'absolute', top: 14, left: 18 }}>
            Cevap
          </Typography>
          <Typography variant="h5" align="center" sx={{ whiteSpace: 'pre-wrap', fontWeight: 600 }}>
            {back}
          </Typography>
          {notes && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
              {notes}
            </Typography>
          )}
        </Card>
      </Box>
    </Box>
  );
}

/* ------------------------- static answer card ------------------------- */

function StaticCard({ front, back, notes, revealed, color, verdict }) {
  return (
    <Card sx={{ borderTop: `4px solid ${color}`, p: { xs: 3, sm: 4 } }}>
      <Typography variant="overline" color="text.secondary">
        Soru
      </Typography>
      <Typography variant="h5" sx={{ whiteSpace: 'pre-wrap', fontWeight: 600, mb: revealed ? 2 : 0 }}>
        {front}
      </Typography>
      {revealed && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {verdict === 'correct' ? (
              <CheckCircleIcon sx={{ color: 'success.main' }} />
            ) : verdict === 'wrong' ? (
              <CancelIcon sx={{ color: 'error.main' }} />
            ) : null}
            <Typography variant="overline" color="text.secondary">
              Cevap
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ whiteSpace: 'pre-wrap', fontWeight: 600 }}>
            {back}
          </Typography>
          {notes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
              {notes}
            </Typography>
          )}
        </>
      )}
    </Card>
  );
}

/* ------------------------- main ------------------------- */

const DECK_ACCENT = '#4da8da';

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
          <CircularProgress size={48} />
        </Box>
      }
    >
      <StudySession />
    </Suspense>
  );
}

function StudySession() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const { deckId } = useParams();
  const searchParams = useSearchParams();
  const cram = searchParams.get('cram') === '1';

  const { fetchStudyQueue, reviewCard, fetchDecks, fetchStats } = useFlashcardStore();

  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState([]);
  const [queue, setQueue] = useState([]);
  const [mode, setMode] = useState('flip'); // flip | choice | type
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState(null); // correct | wrong
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [tally, setTally] = useState({ reviews: 0, correct: 0, answered: 0, again: 0 });

  // Remember the Russian keyboard preference across sessions.
  useEffect(() => {
    setShowKeyboard(localStorage.getItem('velora_cyrillic') === '1');
  }, []);

  const toggleKeyboard = () => {
    setShowKeyboard((v) => {
      const next = !v;
      localStorage.setItem('velora_cyrillic', next ? '1' : '0');
      return next;
    });
  };

  const startRef = useRef(Date.now());
  const totalRef = useRef(0);

  const current = queue[0] || null;
  const uniqueBacks = useMemo(() => new Set(pool.map((p) => p.back)).size, [pool]);
  const canChoice = uniqueBacks >= 4;

  const options = useMemo(() => {
    if (!current || mode !== 'choice') return [];
    return buildOptions(current, pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, mode]);

  const intervals = useMemo(() => (current ? previewIntervals(current) : null), [current]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchStudyQueue(deckId, cram);
    const cards = (data?.cards || []);
    setQueue(cards);
    setPool(data?.pool || []);
    totalRef.current = cards.length;
    startRef.current = Date.now();
    setFinished(cards.length === 0);
    setTally({ reviews: 0, correct: 0, answered: 0, again: 0 });
    setLoading(false);
  }, [deckId, cram, fetchStudyQueue]);

  useEffect(() => {
    load();
  }, [load]);

  const resetCardState = () => {
    setFlipped(false);
    setAnswered(false);
    setSelected(null);
    setTyped('');
    setVerdict(null);
  };

  // Move to the next card; if rating is "again" the card is requeued.
  const advance = useCallback(
    async (rating) => {
      if (!current || submitting) return;
      setSubmitting(true);
      try {
        await reviewCard(current.id, rating);
      } catch (e) {
        console.error('review error', e);
      }
      setSubmitting(false);

      setTally((t) => ({
        reviews: t.reviews + 1,
        again: t.again + (rating === 'again' ? 1 : 0),
        correct: t.correct,
        answered: t.answered,
      }));

      setQueue((q) => {
        const [head, ...rest] = q;
        if (rating === 'again') {
          // Reinsert a few cards later so it resurfaces within the session.
          const pos = Math.min(rest.length, 3);
          const next = [...rest];
          next.splice(pos, 0, head);
          return next;
        }
        return rest;
      });
      resetCardState();
    },
    [current, submitting, reviewCard]
  );

  useEffect(() => {
    if (!loading && !finished && queue.length === 0) {
      setFinished(true);
      fetchDecks();
      fetchStats();
    }
  }, [queue.length, loading, finished, fetchDecks, fetchStats]);

  // Answer handlers for choice/type: record correctness, then reveal.
  const answerChoice = (opt) => {
    if (answered) return;
    const ok = opt === current.back;
    setSelected(opt);
    setVerdict(ok ? 'correct' : 'wrong');
    setAnswered(true);
    setTally((t) => ({ ...t, answered: t.answered + 1, correct: t.correct + (ok ? 1 : 0) }));
  };

  const submitTyped = () => {
    if (answered || !typed.trim()) return;
    const ok = isTypedCorrect(typed, current.back);
    setVerdict(ok ? 'correct' : 'wrong');
    setAnswered(true);
    setTally((t) => ({ ...t, answered: t.answered + 1, correct: t.correct + (ok ? 1 : 0) }));
  };

  const continueAfterAnswer = () => {
    if (!answered) return;
    advance(verdict === 'correct' ? 'good' : 'again');
  };

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      if (finished || loading || !current) return;
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName) && mode !== 'type') return;

      if (mode === 'flip') {
        if (!flipped && (e.code === 'Space' || e.code === 'Enter')) {
          e.preventDefault();
          setFlipped(true);
        } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          advance(RATINGS[Number(e.key) - 1]);
        }
      } else if (mode === 'choice') {
        if (!answered && ['1', '2', '3', '4'].includes(e.key)) {
          const idx = Number(e.key) - 1;
          if (options[idx] !== undefined) answerChoice(options[idx]);
        } else if (answered && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          continueAfterAnswer();
        }
      } else if (mode === 'type') {
        if (!answered && e.code === 'Enter') {
          e.preventDefault();
          submitTyped();
        } else if (answered && e.code === 'Enter') {
          e.preventDefault();
          continueAfterAnswer();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, flipped, answered, current, options, finished, loading, verdict]);

  const changeMode = (_, v) => {
    if (!v) return;
    resetCardState();
    setMode(v);
  };

  const done = totalRef.current - queue.length;
  const progress = totalRef.current > 0 ? (done / totalRef.current) * 100 : 0;

  /* ------------------------- render ------------------------- */

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (finished) {
    const elapsed = Math.round((Date.now() - startRef.current) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const accuracy = tally.answered > 0 ? Math.round((tally.correct / tally.answered) * 100) : null;
    const nothing = totalRef.current === 0;

    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', textAlign: 'center', pt: { xs: 4, sm: 8 } }}>
        <Box
          sx={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            mx: 'auto',
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: nothing ? 'action.hover' : 'success.main',
            color: nothing ? 'text.secondary' : '#fff',
          }}
        >
          <CelebrationIcon sx={{ fontSize: 44 }} />
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {nothing ? 'Her şey güncel!' : 'Oturum tamamlandı'}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {nothing
            ? 'Bu destede bugün tekrar edilecek kart yok. Yarın tekrar gel ya da serbest çalış.'
            : 'Harika iş! İşte bu oturumun özeti.'}
        </Typography>

        {!nothing && (
          <Card sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {tally.reviews}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  tekrar
                </Typography>
              </Box>
              {accuracy !== null && (
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    %{accuracy}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    doğruluk
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {mins > 0 ? `${mins}dk ` : ''}{secs}sn
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  süre
                </Typography>
              </Box>
            </Box>
          </Card>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<ReplayIcon />} onClick={load}>
            {nothing ? 'Serbest çalış' : 'Tekrar çalış'}
          </Button>
          <Button variant="contained" onClick={() => router.push(`/flashcards`)}>
            Destelere dön
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <IconButton onClick={() => router.push(`/flashcards`)} size="small">
          <CloseIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover' }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 54, textAlign: 'right' }} className="num">
          {done} / {totalRef.current}
        </Typography>
      </Box>

      {/* Mode selector */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <ToggleButtonGroup value={mode} exclusive onChange={changeMode} size="small">
          <ToggleButton value="flip">
            <FlipIcon fontSize="small" sx={{ mr: 0.5 }} /> {!isSmall && 'Çevir'}
          </ToggleButton>
          <Tooltip title={canChoice ? '' : 'Test modu için destede en az 4 kart gerekir'}>
            <span>
              <ToggleButton value="choice" disabled={!canChoice}>
                <QuizIcon fontSize="small" sx={{ mr: 0.5 }} /> {!isSmall && 'Test'}
              </ToggleButton>
            </span>
          </Tooltip>
          <ToggleButton value="type">
            <KeyboardIcon fontSize="small" sx={{ mr: 0.5 }} /> {!isSmall && 'Yaz'}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Card */}
      {mode === 'flip' && (
        <>
          <FlipCard
            front={current.front}
            back={current.back}
            notes={current.notes}
            flipped={flipped}
            color={DECK_ACCENT}
            onClick={() => setFlipped((f) => !f)}
          />
          <Box sx={{ mt: 3 }}>
            {!flipped ? (
              <Button fullWidth variant="contained" size="large" onClick={() => setFlipped(true)}>
                Cevabı Göster
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {RATINGS.map((r, i) => {
                  const meta = RATING_META[r];
                  return (
                    <Button
                      key={r}
                      onClick={() => advance(r)}
                      disabled={submitting}
                      sx={{
                        flex: 1,
                        flexDirection: 'column',
                        py: 1,
                        color: '#fff',
                        bgcolor: meta.color,
                        '&:hover': { bgcolor: meta.color, filter: 'brightness(0.92)' },
                      }}
                    >
                      <Typography variant="button" sx={{ lineHeight: 1.2 }}>
                        {meta.label}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        {formatInterval(intervals[r])}
                      </Typography>
                    </Button>
                  );
                })}
              </Box>
            )}
          </Box>
        </>
      )}

      {mode === 'choice' && (
        <>
          <StaticCard
            front={current.front}
            back={current.back}
            notes={current.notes}
            revealed={answered}
            color={DECK_ACCENT}
            verdict={verdict}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25, mt: 3 }}>
            {options.map((opt, i) => {
              const isCorrect = opt === current.back;
              const isSelected = selected === opt;
              let borderColor = 'divider';
              let bg = 'transparent';
              if (answered) {
                if (isCorrect) {
                  borderColor = theme.palette.success.main;
                  bg = `${theme.palette.success.main}18`;
                } else if (isSelected) {
                  borderColor = theme.palette.error.main;
                  bg = `${theme.palette.error.main}18`;
                }
              }
              return (
                <Card
                  key={i}
                  onClick={() => answerChoice(opt)}
                  sx={{
                    p: 1.75,
                    cursor: answered ? 'default' : 'pointer',
                    border: '2px solid',
                    borderColor,
                    bgcolor: bg,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': answered ? {} : { borderColor: 'primary.main' },
                  }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{opt}</Typography>
                  {answered && isCorrect && <CheckCircleIcon sx={{ color: 'success.main', ml: 'auto' }} />}
                  {answered && isSelected && !isCorrect && <CancelIcon sx={{ color: 'error.main', ml: 'auto' }} />}
                </Card>
              );
            })}
          </Box>
          {answered && (
            <Button fullWidth variant="contained" size="large" sx={{ mt: 2.5 }} onClick={continueAfterAnswer} disabled={submitting}>
              Devam (Enter)
            </Button>
          )}
        </>
      )}

      {mode === 'type' && (
        <>
          <StaticCard
            front={current.front}
            back={current.back}
            notes={current.notes}
            revealed={answered}
            color={DECK_ACCENT}
            verdict={verdict}
          />
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Chip
                icon={<KeyboardIcon fontSize="small" />}
                label="Rusça klavye"
                size="small"
                onClick={toggleKeyboard}
                color={showKeyboard ? 'primary' : 'default'}
                variant={showKeyboard ? 'filled' : 'outlined'}
              />
            </Box>
            <TextField
              fullWidth
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Cevabını yaz…"
              disabled={answered}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !answered) {
                  e.preventDefault();
                  submitTyped();
                }
              }}
              slotProps={{
                input: {
                  sx: answered
                    ? {
                        bgcolor:
                          verdict === 'correct'
                            ? `${theme.palette.success.main}14`
                            : `${theme.palette.error.main}14`,
                      }
                    : undefined,
                },
              }}
            />
            {showKeyboard && (
              <CyrillicKeyboard
                disabled={answered}
                onChar={(ch) => !answered && setTyped((t) => t + ch)}
                onBackspace={() => !answered && setTyped((t) => t.slice(0, -1))}
                onEnter={() => (answered ? continueAfterAnswer() : submitTyped())}
              />
            )}
            {answered && verdict === 'wrong' && (
              <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
                Senin cevabın: {typed || '—'}
              </Typography>
            )}
            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 2 }}
              onClick={answered ? continueAfterAnswer : submitTyped}
              disabled={submitting || (!answered && !typed.trim())}
            >
              {answered ? 'Devam (Enter)' : 'Kontrol Et (Enter)'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
