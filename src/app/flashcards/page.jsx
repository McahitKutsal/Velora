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
import SchoolIcon from '@mui/icons-material/School';
import BoltIcon from '@mui/icons-material/Bolt';
import { ResponsiveContainer, BarChart, Bar, Tooltip as RTooltip, XAxis, Cell } from 'recharts';
import useFlashcardStore from '@/stores/flashcardStore';
import { DECK_COLORS } from '@/lib/flashcardConstants';

const emptyForm = { name: '', description: '', color: DECK_COLORS[0] };

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

function DeckCard({ deck, onStudy, onEdit, onDelete, busy }) {
  const [anchor, setAnchor] = useState(null);
  const router = useRouter();
  const color = deck.color || DECK_COLORS[0];
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

  useEffect(() => {
    fetchDecks();
    fetchStats();
  }, [fetchDecks, fetchStats]);

  const handleOpen = (deck = null) => {
    if (deck) {
      setEditId(deck.id);
      setForm({ name: deck.name, description: deck.description || '', color: deck.color || DECK_COLORS[0] });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
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
          <StatTile icon={<TaskAltIcon />} label="Bugün çalışılan" value={stats?.reviewedToday ?? '—'} color="#22c55e" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile icon={<LocalFireDepartmentIcon />} label="Gün serisi" value={stats ? `${stats.streak}` : '—'} color="#f59e0b" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatTile icon={<StyleIcon />} label="Toplam kart" value={stats?.totalCards ?? '—'} color="#a855f7" />
        </Grid>
        {stats && stats.totalCards > 0 && (
          <Grid size={{ xs: 12 }}>
            <ActivityChart series={stats.dailySeries} />
          </Grid>
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
        <DialogTitle>{editId ? 'Desteyi Düzenle' : 'Yeni Deste'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Deste adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            autoFocus
          />
          <TextField
            label="Açıklama (isteğe bağlı)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : editId ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
