'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardActionArea,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  LinearProgress,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StyleIcon from '@mui/icons-material/Style';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import SchoolIcon from '@mui/icons-material/School';
import BoltIcon from '@mui/icons-material/Bolt';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { ResponsiveContainer, BarChart, Bar, Tooltip as RTooltip, XAxis, Cell } from 'recharts';
import useFlashcardStore from '@/stores/flashcardStore';
import LangKeyboard from '@/components/LangKeyboard';
import PageHeader from '@/components/ui/PageHeader';
import StatTile from '@/components/ui/StatTile';
import SectionCard from '@/components/ui/SectionCard';
import EmptyState from '@/components/ui/EmptyState';
import { ChartTooltip, ChartLegend, useChartTokens } from '@/components/ui/ChartKit';
import { DECK_COLORS, resolveDeckColor, STATUS_LABELS } from '@/lib/flashcardConstants';
import { DEFAULT_LANG, LANGUAGE_LIST, getLanguage } from '@/lib/languages';

const emptyForm = { name: '', description: '', color: DECK_COLORS[0], lang: DEFAULT_LANG };

/* ------------------------------------------------------------------ */
/* Grafikler                                                           */
/* ------------------------------------------------------------------ */

function ActivityChart({ series }) {
  const c = useChartTokens();
  const data = useMemo(
    () =>
      (series || []).map((d) => ({
        ...d,
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      })),
    [series]
  );
  const total = data.reduce((s, d) => s + d.count, 0);
  const accent = c.colors[0];

  return (
    <SectionCard
      title="Son 14 gün"
      action={
        <Typography variant="caption" color="text.secondary">
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }} className="num">
            {total}
          </Box>{' '}
          tekrar
        </Typography>
      }
    >
      <ResponsiveContainer width="100%" height={132}>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
          <XAxis dataKey="label" {...c.axis} interval={1} />
          <RTooltip
            cursor={{ fill: c.cursor.fill }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip title={label} rows={[{ color: accent, label: 'Tekrar', value: payload[0].value }]} />
              ) : null
            }
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={20}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.count > 0 ? accent : c.axis.stroke} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// Öğrenme aşamaları tek hue üzerinde sıralı bir rampa; yığılmış çubukta
// segmentler 2px yüzey boşluğuyla ayrılır.
function StageBar({ stages, total }) {
  return (
    <Box sx={{ display: 'flex', gap: '2px', height: 10, borderRadius: 999, overflow: 'hidden' }}>
      {stages.map((s) =>
        s.value > 0 ? (
          <Box key={s.key} sx={{ width: `${(s.value / total) * 100}%`, bgcolor: s.color }} />
        ) : null
      )}
    </Box>
  );
}

function LearningInsights({ stats }) {
  const theme = useTheme();
  const c = useChartTokens();
  const ramp = theme.palette.data.stage;

  const stages = [
    { key: 'new', label: STATUS_LABELS.new, color: ramp.new, value: stats.breakdown?.new || 0 },
    { key: 'young', label: STATUS_LABELS.young, color: ramp.young, value: stats.breakdown?.young || 0 },
    { key: 'mature', label: STATUS_LABELS.mature, color: ramp.mature, value: stats.breakdown?.mature || 0 },
  ];
  const stageTotal = stages.reduce((s, x) => s + x.value, 0);

  const forecast = (stats.dueForecast || []).map((d, i) => ({
    ...d,
    label: i === 0 ? 'Bugün' : new Date(`${d.date}T00:00:00`).toLocaleDateString('tr-TR', { weekday: 'short' }),
  }));

  return (
    <SectionCard
      title="Öğrenme durumu"
      action={
        stats.leechCount > 0 ? (
          <Chip
            size="small"
            variant="outlined"
            icon={<LocalFireDepartmentIcon sx={{ fontSize: 15 }} />}
            label={`${stats.leechCount} inatçı kart`}
            sx={{ color: 'error.main', borderColor: 'error.main', fontWeight: 650, '& .MuiChip-icon': { color: 'inherit' } }}
          />
        ) : null
      }
    >
      {stageTotal > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <StageBar stages={stages} total={stageTotal} />
          <ChartLegend items={stages.map((s) => ({ label: s.label, color: s.color, value: s.value }))} />
        </Box>
      )}

      <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
        Önümüzdeki 7 gün
      </Typography>
      <ResponsiveContainer width="100%" height={112}>
        <BarChart data={forecast} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="26%">
          <XAxis dataKey="label" {...c.axis} />
          <RTooltip
            cursor={{ fill: c.cursor.fill }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip title={label} rows={[{ color: ramp.young, label: 'Vadesi gelen', value: payload[0].value }]} />
              ) : null
            }
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {forecast.map((d, i) => (
              <Cell key={i} fill={i === 0 ? theme.palette.primary.main : ramp.young} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Deste kartı                                                         */
/* ------------------------------------------------------------------ */

function DeckCard({ deck, onStudy, onEdit, onDelete, busy }) {
  const [anchor, setAnchor] = useState(null);
  const theme = useTheme();
  const router = useRouter();
  const color = resolveDeckColor(deck.color, theme.palette.mode);
  const language = getLanguage(deck.lang);
  const reviewDue = Math.max(0, deck.due - deck.new_count);
  const progress = deck.total > 0 ? ((deck.total - deck.due) / deck.total) * 100 : 0;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { borderColor: 'primary.main' } }}>
      <CardActionArea
        onClick={() => router.push(`/flashcards/${deck.id}`)}
        sx={{ p: 2.25, pb: 1.5, alignItems: 'flex-start', display: 'block', flex: 1 }}
        disabled={busy}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
          {/* Deste kimliği: renk noktası her zaman adla birlikte okunur */}
          <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: color, flexShrink: 0 }} />
          <Typography variant="subtitle1" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {deck.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.04em' }}>
            {language.short}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            minHeight: 38,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {deck.description || 'Açıklama yok'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 2 }}>
          <Typography variant="h5" component="p" className="num" sx={{ lineHeight: 1 }}>
            {deck.total}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            kart
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1.5 }}>
            {reviewDue > 0 && (
              <Typography variant="caption" color="text.secondary">
                <Box component="span" className="num" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {reviewDue}
                </Box>{' '}
                tekrar
              </Typography>
            )}
            {deck.new_count > 0 && (
              <Typography variant="caption" color="text.secondary">
                <Box component="span" className="num" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {deck.new_count}
                </Box>{' '}
                yeni
              </Typography>
            )}
          </Box>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mt: 1.25, height: 4, '& .MuiLinearProgress-bar': { bgcolor: color } }}
        />
      </CardActionArea>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.25, pb: 2, pt: 0.5 }}>
        <Button
          size="small"
          variant={deck.due > 0 ? 'contained' : 'outlined'}
          startIcon={<PlayArrowIcon />}
          onClick={() => onStudy(deck)}
          disabled={deck.total === 0}
        >
          {deck.due > 0 ? `Çalış · ${deck.due}` : 'Çalış'}
        </Button>
        <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} disabled={busy}>
          {busy ? <CircularProgress size={18} /> : <MoreVertIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onEdit(deck);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1.25 }} /> Düzenle
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onDelete(deck);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.25 }} /> Sil
        </MenuItem>
      </Menu>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export default function FlashcardsPage() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const {
    decks,
    loading,
    saving,
    busyIds,
    stats,
    fetchDecks,
    fetchStats,
    addDeck,
    updateDeck,
    deleteDeck,
  } = useFlashcardStore();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeField, setActiveField] = useState('name');
  const [dailyGoal, setDailyGoal] = useState(20);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('20');

  useEffect(() => {
    fetchDecks();
    fetchStats();
  }, [fetchDecks, fetchStats]);

  useEffect(() => {
    const saved = Number(localStorage.getItem('velora_daily_goal'));
    if (saved > 0) setDailyGoal(saved);
    // Ekran klavyesi tercihi çalışma ekranıyla ortak (anahtar adı eski).
    setShowKeyboard(localStorage.getItem('velora_cyrillic') === '1');
  }, []);

  const openGoalEditor = () => {
    setGoalInput(String(dailyGoal));
    setGoalOpen(true);
  };

  const saveGoal = () => {
    const n = Math.max(1, Math.min(500, Math.round(Number(goalInput) || 0)));
    setDailyGoal(n);
    localStorage.setItem('velora_daily_goal', String(n));
    setGoalOpen(false);
  };

  const toggleKeyboard = () => {
    setShowKeyboard((v) => {
      const next = !v;
      localStorage.setItem('velora_cyrillic', next ? '1' : '0');
      return next;
    });
  };

  const kbInsert = (ch) => setForm((f) => ({ ...f, [activeField]: (f[activeField] || '') + ch }));
  const kbBackspace = () => setForm((f) => ({ ...f, [activeField]: (f[activeField] || '').slice(0, -1) }));

  const handleOpen = (deck = null) => {
    if (deck) {
      setEditId(deck.id);
      setForm({
        name: deck.name,
        description: deck.description || '',
        color: deck.color || DECK_COLORS[0],
        lang: getLanguage(deck.lang).code,
      });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setActiveField('name');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (editId) await updateDeck(editId, form);
    else await addDeck(form);
    handleClose();
  };

  const handleDelete = async (deck) => {
    if (confirm(`"${deck.name}" destesini ve içindeki tüm kartları silmek istiyor musunuz?`)) {
      await deleteDeck(deck.id);
      fetchStats();
    }
  };

  const totalDue = decks.reduce((s, d) => s + d.due, 0);
  const goalPct = dailyGoal > 0 ? ((stats?.reviewedToday ?? 0) / dailyGoal) * 100 : 0;
  const goalDone = dailyGoal > 0 && (stats?.reviewedToday ?? 0) >= dailyGoal;

  if (loading && decks.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Kartlar"
        subtitle={totalDue > 0 ? `Bugün ${totalDue} kart seni bekliyor` : 'Bugünlük her şey güncel'}
        actions={
          <>
            {totalDue > 0 && (
              <Button variant="contained" startIcon={<BoltIcon />} onClick={() => router.push('/flashcards/all/study')}>
                Tümünü çalış
              </Button>
            )}
            <Button variant={totalDue > 0 ? 'outlined' : 'contained'} startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Yeni deste
            </Button>
          </>
        }
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile icon={<SchoolIcon />} label="Bugün tekrar" value={stats?.due ?? '—'} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile
            icon={<TrackChangesIcon />}
            label="Günlük hedef"
            value={`${stats?.reviewedToday ?? 0}/${dailyGoal}`}
            hint={goalDone ? 'Hedef tamam' : 'Değiştirmek için tıkla'}
            tone={goalDone ? theme.palette.success.main : undefined}
            progress={goalPct}
            onClick={openGoalEditor}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile
            icon={<LocalFireDepartmentIcon />}
            label="Gün serisi"
            value={stats ? stats.streak : '—'}
            hint={stats?.streak > 0 ? 'gün üst üste' : 'bugün başla'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile icon={<StyleIcon />} label="Toplam kart" value={stats?.totalCards ?? '—'} />
        </Grid>

        {stats && stats.totalCards > 0 && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <ActivityChart series={stats.dailySeries} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <LearningInsights stats={stats} />
            </Grid>
          </>
        )}
      </Grid>

      <Typography variant="overline" sx={{ display: 'block', mt: 4, mb: 1.5 }}>
        Desteler
      </Typography>

      {decks.length === 0 ? (
        <EmptyState
          icon={<StyleIcon />}
          title="Henüz deste yok"
          description="Bir deste oluşturup kartlarını ekleyerek aralıklı tekrarla öğrenmeye başla."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              İlk desteyi oluştur
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2}>
          {decks.map((deck) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={deck.id}>
              <DeckCard
                deck={deck}
                busy={busyIds.has(deck.id)}
                onStudy={(d) => router.push(`/flashcards/${d.id}/study`)}
                onEdit={handleOpen}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Deste oluştur / düzenle */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isSmall}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span>{editId ? 'Desteyi düzenle' : 'Yeni deste'}</span>
          <Chip
            icon={<KeyboardIcon fontSize="small" />}
            label={getLanguage(form.lang).keyboardLabel}
            size="small"
            onClick={toggleKeyboard}
            color={showKeyboard ? 'primary' : 'default'}
            variant={showKeyboard ? 'filled' : 'outlined'}
          />
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
          <TextField
            select
            label="Deste dili"
            value={form.lang}
            onChange={(e) => setForm({ ...form, lang: e.target.value })}
            fullWidth
            helperText="Klavye, seslendirme, çeviri ve örnek cümleler bu dile göre çalışır."
          >
            {LANGUAGE_LIST.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Deste adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onFocus={() => setActiveField('name')}
            fullWidth
            autoFocus
          />
          <TextField
            label="Açıklama (isteğe bağlı)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            onFocus={() => setActiveField('description')}
            fullWidth
            multiline
            rows={2}
          />
          <Box>
            <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
              Renk
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
              {DECK_COLORS.map((c) => {
                const selected = form.color === c;
                return (
                  <Box
                    key={c}
                    component="button"
                    type="button"
                    aria-label={`Renk ${c}`}
                    aria-pressed={selected}
                    onClick={() => setForm({ ...form, color: c })}
                    sx={{
                      width: 30,
                      height: 30,
                      p: 0,
                      borderRadius: '9px',
                      bgcolor: resolveDeckColor(c, theme.palette.mode),
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selected ? 'text.primary' : 'transparent',
                      outline: selected ? 'none' : `1px solid ${theme.palette.divider}`,
                      outlineOffset: -1,
                      transition: 'transform 0.12s ease',
                      '&:hover': { transform: 'scale(1.08)' },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
          {showKeyboard && <LangKeyboard lang={form.lang} onChar={kbInsert} onBackspace={kbBackspace} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            İptal
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : editId ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Günlük hedef */}
      <Dialog open={goalOpen} onClose={() => setGoalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Günlük hedef</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Her gün kaç kart tekrar etmeyi hedefliyorsun?
          </Typography>
          <TextField
            label="Hedef (kart/gün)"
            type="number"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
            fullWidth
            autoFocus
            slotProps={{ htmlInput: { min: 1, max: 500 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalOpen(false)} color="inherit">
            İptal
          </Button>
          <Button variant="contained" onClick={saveGoal}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
