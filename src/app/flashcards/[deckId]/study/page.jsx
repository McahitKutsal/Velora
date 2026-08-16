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
  Popover,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CelebrationIcon from '@mui/icons-material/Celebration';
import FlipIcon from '@mui/icons-material/Flip';
import QuizIcon from '@mui/icons-material/Quiz';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import HearingRoundedIcon from '@mui/icons-material/HearingRounded';
import ReplayCircleFilledRoundedIcon from '@mui/icons-material/ReplayCircleFilledRounded';
import KeyboardCommandKeyRoundedIcon from '@mui/icons-material/KeyboardCommandKeyRounded';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ExtensionRoundedIcon from '@mui/icons-material/ExtensionRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import useFlashcardStore from '@/stores/flashcardStore';
import LangKeyboard from '@/components/LangKeyboard';
import SpeakButton from '@/components/SpeakButton';
import ClickableWords from '@/components/ClickableWords';
import ExampleSentence from '@/components/ExampleSentence';
import ScrambleCard from '@/components/ScrambleCard';
import ClozeCard, { useCloze } from '@/components/ClozeCard';
import { speak, isSpeechSupported } from '@/lib/speech';
import { getLanguage } from '@/lib/languages';
import { MODES, pickActivity, scrambleLetters } from '@/lib/studyActivities';
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

// locale: cevabın dili — küçük harfe çevirme dile bağlıdır (Türkçe I/ı,
// Almanca I/i farkı yanlış "yanlış cevap" üretmesin).
function normalize(s, locale) {
  return (s || '')
    .toLocaleLowerCase(locale)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '');
}

function isTypedCorrect(typed, target, locale) {
  const answers = target.split(/[/,]/).map((a) => normalize(a, locale)).filter(Boolean);
  const guess = normalize(typed, locale);
  return answers.includes(guess);
}

// key: cevabın hangi alandan geldiği ('back' normal, 'front' ters mod).
// Havuz, karışık deste çalışmasında (tümü) yanlış dilden şık gelmesin diye
// çağıran tarafından karta göre filtrelenir.
function buildOptions(current, pool, key) {
  const seen = new Set([current[key]]);
  const distractors = [];
  for (const p of shuffle(pool)) {
    if (distractors.length >= 3) break;
    if (seen.has(p[key])) continue;
    seen.add(p[key]);
    distractors.push(p[key]);
  }
  return shuffle([current[key], ...distractors]);
}

// Kart arka planına NET görseli koyan katman (bulanık değil). Okunaklık,
// yazının arkasındaki yarı saydam zeminle (Readable) sağlanır.
function CardBackdrop({ imageUrl, show }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundImage: imageUrl ? `url("${imageUrl}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: show && imageUrl ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }}
    />
  );
}

// Görsel açıkken yazının arkasına yarı saydam + hafif bulanık zemin koyar.
function Readable({ show, children, sx }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        borderRadius: 1.5,
        transition: 'background-color 0.3s ease, padding 0.3s ease',
        ...(show && {
          px: 1.25,
          py: 0.5,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.62),
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// Arka plan görselini açıp kapatan göz butonu (görsel yoksa görünmez).
function ImageEyeButton({ imageUrl, show, onToggle }) {
  if (!imageUrl) return null;
  return (
    <Tooltip title={show ? 'Görseli gizle' : 'Görseli göster'}>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label="Arka plan görselini aç/kapat"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          color: show ? 'primary.main' : 'text.secondary',
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {show ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

/* Bir terimi gösterir: hedef dildeyse tıklanabilir kelimeler + seslendirme,
   Türkçe ise düz metin. Kart yüzlerinde tekrar kullanılır. */
function Term({ text, foreign, language, align = 'left' }) {
  const justify = align === 'center' ? 'center' : 'flex-start';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: justify, gap: 0.5, width: '100%' }}>
      <Typography variant="h5" align={align} sx={{ whiteSpace: 'pre-wrap', fontWeight: 600 }}>
        {foreign ? <ClickableWords text={text} lang={language.code} /> : text}
      </Typography>
      {foreign && <SpeakButton text={text} lang={language.speech} />}
    </Box>
  );
}

/* ------------------------- flip card ------------------------- */

function FlipCard({ prompt, answer, notes, promptIsForeign, language, flipped, color, onClick, imageUrl, showImage, onToggleImage }) {
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
            bgcolor: 'background.paper',
            // backface-visibility bazı tarayıcılarda (backdrop-filter/transform ile)
            // yüzü gizleyemiyor; dönüşün ortasında opacity ile kesin gizle.
            opacity: flipped ? 0 : 1,
            transition: 'opacity 0s linear 0.275s',
          }}
        >
          <CardBackdrop imageUrl={imageUrl} show={showImage} />
          <Typography variant="overline" color="text.secondary" sx={{ position: 'absolute', top: 14, left: 18, zIndex: 1 }}>
            Soru
          </Typography>
          <ImageEyeButton imageUrl={imageUrl} show={showImage} onToggle={onToggleImage} />
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              px: 2,
              zIndex: 1,
              display: 'flex',
              justifyContent: 'center',
              // Görsel açılınca yazı animasyonla kartın üstüne kayar.
              top: showImage ? 44 : '50%',
              transform: showImage ? 'translateY(0)' : 'translateY(-50%)',
              transition: 'top 0.45s cubic-bezier(0.4, 0.2, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0.2, 0.2, 1)',
            }}
          >
            <Readable show={showImage}>
              <Term text={prompt} foreign={promptIsForeign} language={language} align="center" />
            </Readable>
          </Box>
          <Typography variant="caption" color="text.disabled" sx={{ position: 'absolute', bottom: 12, zIndex: 1 }}>
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
            opacity: flipped ? 1 : 0,
            transition: 'opacity 0s linear 0.275s',
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ position: 'absolute', top: 14, left: 18 }}>
            Cevap
          </Typography>
          <Term text={answer} foreign={!promptIsForeign} language={language} align="center" />
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

function StaticCard({ prompt, answer, notes, promptIsForeign, language, revealed, color, verdict, imageUrl, showImage, onToggleImage }) {
  return (
    <Card sx={{ position: 'relative', borderTop: `4px solid ${color}`, p: { xs: 3, sm: 4 } }}>
      <CardBackdrop imageUrl={imageUrl} show={showImage} />
      <ImageEyeButton imageUrl={imageUrl} show={showImage} onToggle={onToggleImage} />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography variant="overline" color="text.secondary">
          Soru
        </Typography>
        <Box sx={{ mb: revealed ? 2 : 0 }}>
          <Readable show={showImage}>
            <Term text={prompt} foreign={promptIsForeign} language={language} />
          </Readable>
        </Box>
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
            <Readable show={showImage}>
              <Term text={answer} foreign={!promptIsForeign} language={language} />
            </Readable>
            {notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                {notes}
              </Typography>
            )}
          </>
        )}
      </Box>
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
  const [mode, setMode] = useState('mixed'); // mixed | flip | choice | type | listen | scramble | cloze
  const [clozeMisses, setClozeMisses] = useState(() => new Set()); // cümle bulunamayan kartlar
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState(null); // correct | wrong
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [reversed, setReversed] = useState(false); // false: hedef dil→tr, true: tr→hedef dil
  const [autoPlay, setAutoPlay] = useState(false); // hedef dildeki tarafı otomatik seslendir
  const [showImage, setShowImage] = useState(false); // arka plan görselini göster
  const [helpAnchor, setHelpAnchor] = useState(null); // kısayol lejantı
  const [tally, setTally] = useState({ reviews: 0, correct: 0, answered: 0, again: 0 });

  // Remember preferences across sessions.
  useEffect(() => {
    setShowKeyboard(localStorage.getItem('velora_cyrillic') === '1');
    setReversed(localStorage.getItem('velora_reverse') === '1');
    setAutoPlay(localStorage.getItem('velora_autoplay') === '1');
    const savedMode = localStorage.getItem('velora_mode');
    if (MODES.includes(savedMode)) setMode(savedMode);
  }, []);

  const toggleKeyboard = () => {
    setShowKeyboard((v) => {
      const next = !v;
      localStorage.setItem('velora_cyrillic', next ? '1' : '0');
      return next;
    });
  };

  const toggleReversed = () => {
    setReversed((v) => {
      const next = !v;
      localStorage.setItem('velora_reverse', next ? '1' : '0');
      return next;
    });
    resetCardState();
  };

  const toggleAutoPlay = () => {
    setAutoPlay((v) => {
      const next = !v;
      localStorage.setItem('velora_autoplay', next ? '1' : '0');
      return next;
    });
  };

  const startRef = useRef(Date.now());
  const totalRef = useRef(0);

  const current = queue[0] || null;
  // Hedef dildeki terim her zaman kartın "front" tarafıdır; ters modda cevaba düşer.
  const answerKey = reversed ? 'front' : 'back';
  const promptText = current ? (reversed ? current.back : current.front) : '';
  const answerText = current ? current[answerKey] : '';
  const promptIsForeign = !reversed;
  // Kartın dili destesinden gelir; "tümünü çalış"ta kart kart değişebilir.
  const language = getLanguage(current?.lang);
  // Yazılan cevabın dili: ters modda / dinleme modunda hedef dil, yoksa Türkçe.
  const answerLocale = reversed ? language.locale : 'tr-TR';

  // Şıklar yalnız aynı dildeki kartlardan gelsin (karışık çalışmada önemli).
  const samePool = useMemo(
    () => (current ? pool.filter((p) => p.lang === current.lang) : []),
    [pool, current?.lang] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const uniqueAnswers = useMemo(
    () => new Set(samePool.map((p) => p[answerKey])).size,
    [samePool, answerKey]
  );
  const canChoice = uniqueAnswers >= 4;
  const [canListen] = useState(() => isSpeechSupported());

  /* --- Hangi aktivite gösterilecek? ---------------------------------- */
  // Karışık modda kartın SRS durumu karar verir; diğer modlarda seçim sabittir.
  const clozeMissed = current ? clozeMisses.has(current.id) : false;
  const candidate = mode === 'mixed' ? pickActivity(current, { canChoice, canListen, clozeMissed }) : mode;
  // Cümle bulunamayan kartta boşluk doldurma yerine yazma moduna düşülür.
  const activity = candidate === 'cloze' && clozeMissed ? 'type' : candidate;
  const wantsCloze = candidate === 'cloze' && !clozeMissed;

  const { loading: clozeLoading, cloze } = useCloze(current, language.code, wantsCloze);

  useEffect(() => {
    if (!wantsCloze || clozeLoading || cloze || !current) return;
    setClozeMisses((prev) => {
      if (prev.has(current.id)) return prev;
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });
  }, [wantsCloze, clozeLoading, cloze, current]);

  const scrambleTiles = useMemo(() => scrambleLetters(current?.front), [current?.front]);

  // Cevabın yazılarak/dizilerek verildiği aktiviteler ortak cevap alanını kullanır.
  const isWritten = ['type', 'listen', 'cloze', 'scramble'].includes(activity);
  const canSubmit =
    activity === 'scramble'
      ? scrambleTiles.length > 0 && typed.length === scrambleTiles.length
      : Boolean(typed.trim());

  const options = useMemo(() => {
    if (!current || activity !== 'choice') return [];
    return buildOptions(current, samePool, answerKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, activity, answerKey, samePool]);

  const intervals = useMemo(() => (current ? previewIntervals(current) : null), [current]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchStudyQueue(deckId, cram);
    // Kartları her oturumda karıştır ki hep aynı sırayla gelmesin.
    const cards = shuffle(data?.cards || []);
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
    setShowImage(false); // yeni kartta görsel yine gizli başlasın
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

  // Otomatik seslendirme: hedef dildeki taraf ilk kez görününce bir kez oku.
  const autoSpokeRef = useRef(null);
  useEffect(() => {
    if (!autoPlay || !current) return;
    // Ters yönde ve kelimeyi gizleyen aktivitelerde (harf dizme, boşluk
    // doldurma, dinleme) kelime cevabın kendisidir; erken okuyup ele verme.
    const hidden =
      reversed || activity === 'scramble' || activity === 'cloze' || activity === 'listen';
    const foreignVisible = hidden ? (activity === 'flip' ? flipped : answered) : true;
    if (!foreignVisible) return;
    const stamp = `${current.id}:${reversed ? 'a' : 'p'}`;
    if (autoSpokeRef.current === stamp) return;
    autoSpokeRef.current = stamp;
    speak(current.front, language.speech);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, reversed, activity, flipped, answered, current?.id]);

  // Dinleme modu: her yeni kartta hedef dildeki kelimeyi otomatik oku.
  const listenSpokeRef = useRef(null);
  useEffect(() => {
    if (activity !== 'listen' || !current) return;
    if (listenSpokeRef.current === current.id) return;
    listenSpokeRef.current = current.id;
    speak(current.front, language.speech);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, current?.id]);

  // Answer handlers for choice/type: record correctness, then reveal.
  const answerChoice = (opt) => {
    if (answered) return;
    const ok = opt === answerText;
    setSelected(opt);
    setVerdict(ok ? 'correct' : 'wrong');
    setAnswered(true);
    setTally((t) => ({ ...t, answered: t.answered + 1, correct: t.correct + (ok ? 1 : 0) }));
  };

  // Aktiviteye göre neyin sorulduğu: dinleme/harf dizme/boşluk doldurmada hep
  // hedef dildeki kelime, diğerlerinde seçili yöne göre kartın karşı yüzü.
  const typedTarget = () => {
    if (!current) return { text: '', locale: answerLocale };
    if (activity === 'listen' || activity === 'scramble') {
      return { text: current.front, locale: language.locale };
    }
    if (activity === 'cloze') {
      // Cümledeki çekimli hâli de temel hâli de kabul et.
      return { text: `${cloze?.answer || current.front},${cloze?.base || ''}`, locale: language.locale };
    }
    return { text: answerText, locale: answerLocale };
  };

  const submitTyped = () => {
    if (answered || !typed.trim()) return;
    const { text, locale } = typedTarget();
    // Harf dizmede boşluk taşı yok; karşılaştırmada boşlukları yok say.
    const ok =
      activity === 'scramble'
        ? normalize(typed, locale).replace(/\s+/g, '') === normalize(text, locale).replace(/\s+/g, '')
        : isTypedCorrect(typed, text, locale);
    setVerdict(ok ? 'correct' : 'wrong');
    setAnswered(true);
    setTally((t) => ({ ...t, answered: t.answered + 1, correct: t.correct + (ok ? 1 : 0) }));
  };

  const continueAfterAnswer = () => {
    if (!answered) return;
    advance(verdict === 'correct' ? 'good' : 'again');
  };

  // Harf dizmede fiziksel klavyeden yazılan harf, havuzdaki eşleşen taşı tüketir.
  const typeScrambleChar = (ch) => {
    const used = Array.from(typed);
    const pool = [...scrambleTiles];
    for (const c of used) {
      const i = pool.indexOf(c);
      if (i >= 0) pool.splice(i, 1);
    }
    const match = pool.find((c) => c.toLocaleLowerCase(language.locale) === ch.toLocaleLowerCase(language.locale));
    if (match) setTyped(typed + match);
  };

  /* keyboard shortcuts */
  useEffect(() => {
    const typing = activity === 'type' || activity === 'listen' || activity === 'cloze';
    const onKey = (e) => {
      if (finished || loading || !current) return;
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !typing) return;

      if (activity === 'flip') {
        if (!flipped && (e.code === 'Space' || e.code === 'Enter')) {
          e.preventDefault();
          setFlipped(true);
        } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          advance(RATINGS[Number(e.key) - 1]);
        }
      } else if (activity === 'choice') {
        if (!answered && ['1', '2', '3', '4'].includes(e.key)) {
          const idx = Number(e.key) - 1;
          if (options[idx] !== undefined) answerChoice(options[idx]);
        } else if (answered && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          continueAfterAnswer();
        }
      } else if (activity === 'scramble') {
        if (e.code === 'Enter') {
          e.preventDefault();
          if (answered) continueAfterAnswer();
          else if (typed.length === scrambleTiles.length) submitTyped();
        } else if (!answered && e.code === 'Backspace') {
          e.preventDefault();
          setTyped((t) => t.slice(0, -1));
        } else if (!answered && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          typeScrambleChar(e.key);
        }
      } else if (typing) {
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
  }, [activity, flipped, answered, current, options, finished, loading, verdict, typed, scrambleTiles]);

  const changeMode = (_, v) => {
    if (!v) return;
    resetCardState();
    setMode(v);
    localStorage.setItem('velora_mode', v);
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

  // Son kart cevaplanınca queue bir an boş kalır; "finished" efekti henüz
  // çalışmadan bu render'da current null olur. Kısa süre hiçbir şey gösterme.
  if (!current) return null;

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <ToggleButtonGroup value={mode} exclusive onChange={changeMode} size="small">
          <Tooltip title="Karışık: her kartta seviyesine uygun aktivite">
            <ToggleButton value="mixed">
              <AutoAwesomeRoundedIcon fontSize="small" sx={{ mr: 0.5 }} /> {!isSmall && 'Karışık'}
            </ToggleButton>
          </Tooltip>
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
          <Tooltip title="Harfleri dizerek kelimeyi kur">
            <ToggleButton value="scramble">
              <ExtensionRoundedIcon fontSize="small" sx={{ mr: 0.5 }} /> {!isSmall && 'Kur'}
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Örnek cümlede boşluğu doldur">
            <ToggleButton value="cloze">
              <FormatQuoteRoundedIcon fontSize="small" sx={{ mr: 0.5 }} /> {!isSmall && 'Cümle'}
            </ToggleButton>
          </Tooltip>
          <ToggleButton value="listen">
            <HearingRoundedIcon fontSize="small" sx={{ mr: 0.5 }} /> {!isSmall && 'Dinle'}
          </ToggleButton>
        </ToggleButtonGroup>

        <Tooltip title={reversed ? `Yön: Türkçe → ${language.label}` : `Yön: ${language.label} → Türkçe`}>
          <Chip
            icon={<SwapHorizIcon fontSize="small" />}
            label={reversed ? `TR → ${language.short}` : `${language.short} → TR`}
            size="small"
            onClick={toggleReversed}
            color={reversed ? 'primary' : 'default'}
            variant={reversed ? 'filled' : 'outlined'}
          />
        </Tooltip>
        <Tooltip title={autoPlay ? 'Otomatik seslendirme açık' : 'Otomatik seslendirme kapalı'}>
          <Chip
            icon={<VolumeUpRoundedIcon fontSize="small" />}
            label={!isSmall ? 'Oto ses' : ''}
            size="small"
            onClick={toggleAutoPlay}
            color={autoPlay ? 'primary' : 'default'}
            variant={autoPlay ? 'filled' : 'outlined'}
            sx={isSmall ? { '.MuiChip-label': { px: 0.5 } } : undefined}
          />
        </Tooltip>
        <Tooltip title="Klavye kısayolları">
          <IconButton size="small" onClick={(e) => setHelpAnchor(e.currentTarget)} aria-label="Klavye kısayolları">
            <KeyboardCommandKeyRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Popover
        open={Boolean(helpAnchor)}
        anchorEl={helpAnchor}
        onClose={() => setHelpAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Klavye kısayolları
          </Typography>
          {[
            ['Boşluk / Enter', 'Cevabı göster (Çevir)'],
            ['1 – 4', 'Değerlendir (Çevir) / Şık seç (Test)'],
            ['Enter', 'Kontrol et / Devam (Yaz, Cümle, Dinle)'],
            ['Harfler', 'Taş yerleştir (Kur)'],
            ['Backspace', 'Son harfi geri al (Kur)'],
          ].map(([keys, desc]) => (
            <Box key={keys} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5 }}>
              <Box
                component="kbd"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.75,
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {keys}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                {desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Popover>

      {/* Card */}
      {activity === 'flip' && (
        <>
          <FlipCard
            prompt={promptText}
            answer={answerText}
            promptIsForeign={promptIsForeign}
            language={language}
            notes={current.notes}
            flipped={flipped}
            color={DECK_ACCENT}
            onClick={() => setFlipped((f) => !f)}
            imageUrl={current.image_url}
            showImage={showImage}
            onToggleImage={() => setShowImage((v) => !v)}
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

      {activity === 'choice' && (
        <>
          <StaticCard
            prompt={promptText}
            answer={answerText}
            promptIsForeign={promptIsForeign}
            language={language}
            notes={current.notes}
            revealed={answered}
            color={DECK_ACCENT}
            verdict={verdict}
            imageUrl={current.image_url}
            showImage={showImage}
            onToggleImage={() => setShowImage((v) => !v)}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25, mt: 3 }}>
            {options.map((opt, i) => {
              const isCorrect = opt === answerText;
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

      {/* Yazarak cevaplanan aktiviteler: yaz / dinle / cümle / harf dizme.
          Soru kartı aktiviteye göre değişir, cevap alanı ortaktır. */}
      {isWritten && (
        <>
          {activity === 'type' && (
            <StaticCard
              prompt={promptText}
              answer={answerText}
              promptIsForeign={promptIsForeign}
              language={language}
              notes={current.notes}
              revealed={answered}
              color={DECK_ACCENT}
              verdict={verdict}
              imageUrl={current.image_url}
              showImage={showImage}
              onToggleImage={() => setShowImage((v) => !v)}
            />
          )}

          {activity === 'cloze' && (
            <ClozeCard
              key={current.id}
              cloze={cloze}
              loading={clozeLoading}
              card={current}
              language={language}
              answered={answered}
              verdict={verdict}
              color={DECK_ACCENT}
            />
          )}

          {activity === 'scramble' && (
            <ScrambleCard
              key={current.id}
              target={current.front}
              meaning={current.back}
              value={typed}
              onChange={(v) => !answered && setTyped(v)}
              language={language}
              answered={answered}
              verdict={verdict}
              color={DECK_ACCENT}
            />
          )}

          {activity === 'listen' && (
            <Card sx={{ borderTop: `4px solid ${DECK_ACCENT}`, p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
              {!answered ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 1 }}>
                  <Typography variant="overline" color="text.secondary">
                    Dinle
                  </Typography>
                  <IconButton
                    onClick={() => speak(current.front, language.speech)}
                    aria-label="Tekrar dinle"
                    sx={{ color: 'primary.main' }}
                  >
                    <ReplayCircleFilledRoundedIcon sx={{ fontSize: 72 }} />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    Duyduğun {language.label} kelimeyi yaz
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                    {verdict === 'correct' ? (
                      <CheckCircleIcon sx={{ color: 'success.main' }} />
                    ) : (
                      <CancelIcon sx={{ color: 'error.main' }} />
                    )}
                    <Typography variant="overline" color="text.secondary">
                      Cevap
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Term text={current.front} foreign language={language} align="center" />
                  </Box>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                    {current.back}
                  </Typography>
                  {current.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      {current.notes}
                    </Typography>
                  )}
                </>
              )}
            </Card>
          )}

          <Box sx={{ mt: 3 }}>
            {/* Boşluk doldurma seçilmişti ama kelimeye cümle bulunamadı. */}
            {mode === 'cloze' && clozeMissed && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Bu kelime için örnek cümle bulunamadı — yazarak çalış.
              </Typography>
            )}

            {/* Harf dizmede metin kutusu yok; taşlar kartın içinde. */}
            {activity !== 'scramble' && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Chip
                    icon={<KeyboardIcon fontSize="small" />}
                    label={language.keyboardLabel}
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
                  placeholder={
                    activity === 'listen'
                      ? 'Duyduğun kelimeyi yaz…'
                      : activity === 'cloze'
                        ? 'Boşluğa gelen kelimeyi yaz…'
                        : 'Cevabını yaz…'
                  }
                  disabled={answered || (activity === 'cloze' && !cloze)}
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
                  <LangKeyboard
                    lang={language.code}
                    disabled={answered}
                    onChar={(ch) => !answered && setTyped((t) => t + ch)}
                    onBackspace={() => !answered && setTyped((t) => t.slice(0, -1))}
                    onEnter={() => (answered ? continueAfterAnswer() : submitTyped())}
                  />
                )}
              </>
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
              disabled={submitting || (!answered && !canSubmit)}
            >
              {answered ? 'Devam (Enter)' : 'Kontrol Et (Enter)'}
            </Button>
          </Box>
        </>
      )}

      {/* Kart açıldığında hedef dildeki kelime için örnek cümle. Boşluk
          doldurmada cümle zaten kartın kendisi olduğu için tekrarlanmaz. */}
      {current && (flipped || answered) && activity !== 'cloze' && current.front?.trim() && (
        <ExampleSentence key={current.id} word={current.front} lang={language.code} />
      )}
    </Box>
  );
}
