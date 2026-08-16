'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardActionArea,
  CardContent,
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
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import SchoolIcon from '@mui/icons-material/School';
import BoltIcon from '@mui/icons-material/Bolt';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { ResponsiveContainer, BarChart, Bar, Tooltip as RTooltip, XAxis, Cell } from 'recharts';
import useFlashcardStore from '@/stores/flashcardStore';
import LangKeyboard from '@/components/LangKeyboard';
import { DECK_COLORS } from '@/lib/flashcardConstants';
import { DEFAULT_LANG, LANGUAGE_LIST, getLanguage } from '@/lib/languages';

const emptyForm = { name: '', description: '', color: DECK_COLORS[0], lang: DEFAULT_LANG };

function StatTile({ icon, label, value, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.75 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            bgcolor: (t) => (t.palette.mode === 'dark' ? `${color}22` : `${color}18`),
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight="bold" lineHeight={1.1}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// Günlük hedef: bugün çalışılan / hedef, tıklayınca hedef düzenlenir.
function DailyGoalTile({ reviewed, goal, onEdit }) {
  const done = goal > 0 && reviewed >= goal;
  const pct = goal > 0 ? Math.min(100, (reviewed / goal) * 100) : 0;
  const color = done ? '#22c55e' : '#4da8da';
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={onEdit} sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.75 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              bgcolor: (t) => (t.palette.mode === 'dark' ? `${color}22` : `${color}18`),
            }}
          >
            {done ? <TaskAltIcon /> : <TrackChangesIcon />}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" fontWeight="bold" lineHeight={1.1}>
              {reviewed} <Typography component="span" variant="body2" color="text.secondary">/ {goal}</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Günlük hedef
            </Typography>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{ mt: 0.75, height: 5, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function ActivityChart({ series }) {
  const theme = useTheme();
  const data = useMemo(
    () =>
      (series || []).map((d) => ({
        ...d,
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      })),
    [series]
  );
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="h6">Son 14 Gün</Typography>
          <Typography variant="caption" color="text.secondary">
            {total} tekrar
          </Typography>
        </Box>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} axisLine={false} tickLine={false} />
            <RTooltip
              cursor={{ fill: theme.palette.action.hover }}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
                fontSize: 12,
              }}
              formatter={(v) => [`${v} tekrar`, '']}
              labelFormatter={(l) => l}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={22}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.count > 0 ? theme.palette.primary.main : theme.palette.action.hover}
                  fillOpacity={d.count > 0 ? 0.35 + 0.65 * (d.count / max) : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Öğrenme aşamaları (yeni/genç/olgun) + 7 günlük vade tahmini + inatçı kart uyarısı.
function LearningInsights({ stats }) {
  const theme = useTheme();
  const stages = [
    { key: 'new', label: 'Yeni', color: '#22c55e', value: stats.breakdown?.new || 0 },
    { key: 'young', label: 'Genç', color: '#4da8da', value: stats.breakdown?.young || 0 },
    { key: 'mature', label: 'Olgun', color: '#a855f7', value: stats.breakdown?.mature || 0 },
  ];
  const stageTotal = stages.reduce((s, x) => s + x.value, 0);

  const forecast = (stats.dueForecast || []).map((d, i) => ({
    ...d,
    label: i === 0 ? 'Bugün' : new Date(`${d.date}T00:00:00`).toLocaleDateString('tr-TR', { weekday: 'short' }),
  }));
  const maxF = Math.max(1, ...forecast.map((d) => d.count));

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6">Öğrenme Durumu</Typography>
          {stats.leechCount > 0 && (
            <Chip
              size="small"
              icon={<LocalFireDepartmentIcon sx={{ fontSize: 16 }} />}
              label={`${stats.leechCount} inatçı kart`}
              sx={{ bgcolor: '#f43f5e22', color: '#f43f5e', fontWeight: 600 }}
            />
          )}
        </Box>

        {/* Aşama çubuğu */}
        {stageTotal > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', bgcolor: 'action.hover' }}>
              {stages.map((s) => s.value > 0 && (
                <Box key={s.key} sx={{ width: `${(s.value / stageTotal) * 100}%`, bgcolor: s.color }} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              {stages.map((s) => (
                <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                  <Typography variant="caption" color="text.secondary">
                    {s.label} · <strong>{s.value}</strong>
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* 7 günlük vade tahmini */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Önümüzdeki 7 gün — vadesi gelen kartlar
        </Typography>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={forecast} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <RTooltip
              cursor={{ fill: theme.palette.action.hover }}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
                fontSize: 12,
              }}
              formatter={(v) => [`${v} kart`, '']}
              labelFormatter={(l) => l}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={26}>
              {forecast.map((d, i) => (
                <Cell
                  key={i}
                  fill={i === 0 ? '#f59e0b' : theme.palette.primary.main}
                  fillOpacity={d.count > 0 ? 0.35 + 0.65 * (d.count / maxF) : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DeckCard({ deck, onStudy, onEdit, onDelete, busy }) {
  const [anchor, setAnchor] = useState(null);
  const router = useRouter();
  const color = deck.color || DECK_COLORS[0];
  const language = getLanguage(deck.lang);
  const reviewDue = Math.max(0, deck.due - deck.new_count);
  const progress = deck.total > 0 ? ((deck.total - deck.due) / deck.total) * 100 : 0;

  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: color }} />
      <CardActionArea
        onClick={() => router.push(`/flashcards/${deck.id}`)}
        sx={{ p: 2, pt: 2.25, alignItems: 'flex-start', display: 'block' }}
        disabled={busy}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              background: `linear-gradient(135deg, ${color}, ${color}bb)`,
              flexShrink: 0,
            }}
          >
            <StyleIcon sx={{ fontSize: 20 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
            {deck.name}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            minHeight: 40,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {deck.description || 'Açıklama yok'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
          <Chip size="small" label={`${language.flag} ${language.label}`} variant="outlined" />
          <Chip size="small" label={`${deck.total} kart`} variant="outlined" />
          {reviewDue > 0 && (
            <Chip size="small" label={`${reviewDue} tekrar`} sx={{ bgcolor: '#4da8da22', color: '#2e7eaa', fontWeight: 600 }} />
          )}
          {deck.new_count > 0 && (
            <Chip size="small" label={`${deck.new_count} yeni`} sx={{ bgcolor: '#22c55e22', color: '#16a34a', fontWeight: 600 }} />
          )}
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            mt: 1.75,
            height: 6,
            borderRadius: 3,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
          }}
        />
      </CardActionArea>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pb: 1.5 }}>
        <Button
          size="small"
          variant={deck.due > 0 ? 'contained' : 'outlined'}
          startIcon={<PlayArrowIcon />}
          onClick={() => onStudy(deck)}
          disabled={deck.total === 0}
        >
          {deck.due > 0 ? `Çalış (${deck.due})` : 'Çalış'}
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
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Düzenle
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onDelete(deck);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Sil
        </MenuItem>
      </Menu>
    </Card>
  );
}

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

  // Günlük hedef tercihini hatırla.
  useEffect(() => {
    const saved = Number(localStorage.getItem('velora_daily_goal'));
    if (saved > 0) setDailyGoal(saved);
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

  // On-screen keyboard preference is shared with the study screen.
  // (Anahtar adı eski; kullanıcı tercihi kaybolmasın diye korunuyor.)
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

  if (loading && decks.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Kartlar
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {totalDue > 0 && (
            <Button
              variant="contained"
              startIcon={<BoltIcon />}
              onClick={() => router.push('/flashcards/all/study')}
              size="small"
            >
              Tümünü Çalış ({totalDue})
            </Button>
          )}
          <Button variant={totalDue > 0 ? 'outlined' : 'contained'} startIcon={<AddIcon />} onClick={() => handleOpen()} size="small">
            Yeni Deste
          </Button>
        </Box>
      </Box>

      {/* Stats strip */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile icon={<SchoolIcon />} label="Bugün tekrar" value={stats?.due ?? '—'} color="#4da8da" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DailyGoalTile reviewed={stats?.reviewedToday ?? 0} goal={dailyGoal} onEdit={openGoalEditor} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile icon={<LocalFireDepartmentIcon />} label="Gün serisi" value={stats ? `${stats.streak}` : '—'} color="#f59e0b" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile icon={<StyleIcon />} label="Toplam kart" value={stats?.totalCards ?? '—'} color="#a855f7" />
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

      {/* Decks */}
      {decks.length === 0 ? (
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <StyleIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Henüz deste yok
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Bir deste oluşturup kartlarını ekleyerek aralıklı tekrarla öğrenmeye başla.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              İlk Desteyi Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
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

      {/* Create / edit deck */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isSmall}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span>{editId ? 'Desteyi Düzenle' : 'Yeni Deste'}</span>
          <Chip
            icon={<KeyboardIcon fontSize="small" />}
            label={getLanguage(form.lang).keyboardLabel}
            size="small"
            onClick={toggleKeyboard}
            color={showKeyboard ? 'primary' : 'default'}
            variant={showKeyboard ? 'filled' : 'outlined'}
          />
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
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
                {l.flag} {l.label}
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Renk
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {DECK_COLORS.map((c) => (
                <Tooltip title="" key={c}>
                  <Box
                    onClick={() => setForm({ ...form, color: c })}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
                      border: '3px solid',
                      borderColor: form.color === c ? 'text.primary' : 'transparent',
                      transition: 'transform 0.15s ease',
                      '&:hover': { transform: 'scale(1.1)' },
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
          {showKeyboard && <LangKeyboard lang={form.lang} onChar={kbInsert} onBackspace={kbBackspace} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : editId ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Günlük hedef düzenleme */}
      <Dialog open={goalOpen} onClose={() => setGoalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Günlük hedef</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
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
          <Button onClick={() => setGoalOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={saveGoal}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
