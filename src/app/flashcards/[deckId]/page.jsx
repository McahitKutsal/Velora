'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Tooltip,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import StyleIcon from '@mui/icons-material/Style';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import useFlashcardStore from '@/stores/flashcardStore';
import CyrillicKeyboard from '@/components/CyrillicKeyboard';
import SpeakButton from '@/components/SpeakButton';
import CardImagePicker from '@/components/CardImagePicker';
import { DECK_COLORS, STATUS_META } from '@/lib/flashcardConstants';

const emptyCard = { front: '', back: '', notes: '', image_url: null };

// İlk harfi büyük yaz (Kiril ve Latin için toUpperCase yeterli).
const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function parseBulk(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Accept tab, |, ; or = as the front/back separator (first match wins).
      const m = line.match(/^(.*?)\s*(?:\t|\||;|=)\s*(.*)$/);
      if (!m) return null;
      const front = m[1].trim();
      const back = m[2].trim();
      if (!front || !back) return null;
      return { front, back };
    })
    .filter(Boolean);
}

function formatDue(due) {
  if (!due) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (due <= today) return 'Bugün';
  const diff = Math.round((new Date(`${due}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  if (diff === 1) return 'Yarın';
  return `${diff} gün sonra`;
}

export default function DeckDetailPage() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const { deckId } = useParams();

  const {
    decks,
    cards,
    cardsLoading,
    saving,
    busyIds,
    fetchDecks,
    fetchCards,
    addCard,
    addCards,
    updateCard,
    deleteCard,
    resetCard,
  } = useFlashcardStore();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyCard);
  const [bulk, setBulk] = useState('');
  const [menu, setMenu] = useState({ anchor: null, card: null });
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeField, setActiveField] = useState('front');

  // Russian keyboard preference is shared with the study screen.
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

  // On-screen keyboard writes to whichever field last had focus.
  const kbInsert = (ch) => {
    if (activeField === 'bulk') setBulk((v) => v + ch);
    else setForm((f) => ({ ...f, [activeField]: capFirst((f[activeField] || '') + ch) }));
  };
  const kbBackspace = () => {
    if (activeField === 'bulk') setBulk((v) => v.slice(0, -1));
    else setForm((f) => ({ ...f, [activeField]: (f[activeField] || '').slice(0, -1) }));
  };

  const deck = useMemo(() => decks.find((d) => String(d.id) === String(deckId)), [decks, deckId]);

  useEffect(() => {
    if (decks.length === 0) fetchDecks();
    fetchCards(deckId);
  }, [deckId, fetchCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const bulkParsed = useMemo(() => parseBulk(bulk), [bulk]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyCard);
    setBulk('');
    setTab(0);
    setActiveField('front');
    setOpen(true);
  };

  const openEdit = (card) => {
    setEditId(card.id);
    setForm({ front: card.front, back: card.back, notes: card.notes || '', image_url: card.image_url || null });
    setTab(0);
    setActiveField('front');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyCard);
    setBulk('');
  };

  const handleSave = async () => {
    if (tab === 1 && !editId) {
      if (bulkParsed.length === 0) return;
      await addCards(deckId, bulkParsed);
    } else if (editId) {
      await updateCard(deckId, editId, form);
    } else {
      await addCard(deckId, form);
    }
    handleClose();
  };

  const handleDelete = async (card) => {
    setMenu({ anchor: null, card: null });
    if (confirm('Bu kartı silmek istiyor musunuz?')) await deleteCard(deckId, card.id);
  };

  const handleReset = async (card) => {
    setMenu({ anchor: null, card: null });
    if (confirm('Bu kartın ilerlemesini sıfırlamak istiyor musunuz? Kart yeniden "yeni" olur.')) {
      await resetCard(deckId, card.id);
    }
  };

  const color = deck?.color || DECK_COLORS[0];
  const canSave =
    tab === 1 && !editId ? bulkParsed.length > 0 : form.front.trim() && form.back.trim();

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/flashcards')}
        size="small"
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        Destelere dön
      </Button>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              background: `linear-gradient(135deg, ${color}, ${color}bb)`,
              flexShrink: 0,
            }}
          >
            <StyleIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" fontWeight="bold" noWrap>
              {deck ? deck.name : 'Deste'}
            </Typography>
            {deck?.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {deck.description}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => router.push(`/flashcards/${deckId}/study`)}
            disabled={!cards.length}
          >
            Çalış{deck?.due ? ` (${deck.due})` : ''}
          </Button>
          <Tooltip title="Zamanlamayı yok sayarak tüm kartları çalış">
            <span>
              <Button
                variant="outlined"
                startIcon={<ShuffleIcon />}
                onClick={() => router.push(`/flashcards/${deckId}/study?cram=1`)}
                disabled={!cards.length}
              >
                Serbest
              </Button>
            </span>
          </Tooltip>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd}>
            Kart Ekle
          </Button>
        </Box>
      </Box>

      {/* Cards */}
      {cardsLoading && cards.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <StyleIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Bu destede henüz kart yok
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Tek tek ya da toplu olarak kart ekleyerek başla.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              İlk Kartı Ekle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {cards.length} kart
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {cards.map((card) => {
              const status = STATUS_META[card.status] || STATUS_META.new;
              const busy = busyIds.has(card.id);
              return (
                <Card key={card.id} sx={{ opacity: busy ? 0.5 : 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                    <Box sx={{ width: 4, bgcolor: status.color, flexShrink: 0 }} />
                    <CardContent sx={{ flex: 1, py: 1.5, '&:last-child': { pb: 1.5 }, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography fontWeight={600} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {card.front}
                            </Typography>
                            <SpeakButton text={card.front} sx={{ p: 0.25 }} />
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.25 }}
                          >
                            {card.back}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
                            <Chip
                              size="small"
                              label={status.label}
                              sx={{ bgcolor: `${status.color}22`, color: status.color, fontWeight: 600 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatDue(card.due_date)}
                              {card.repetitions > 0 && ` · ${card.repetitions}× tekrar`}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => setMenu({ anchor: e.currentTarget, card })}
                          sx={{ alignSelf: 'flex-start' }}
                          disabled={busy}
                        >
                          {busy ? <CircularProgress size={18} /> : <MoreVertIcon fontSize="small" />}
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Box>
                </Card>
              );
            })}
          </Box>
        </>
      )}

      <Menu anchorEl={menu.anchor} open={Boolean(menu.anchor)} onClose={() => setMenu({ anchor: null, card: null })}>
        <MenuItem onClick={() => { openEdit(menu.card); setMenu({ anchor: null, card: null }); }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Düzenle
        </MenuItem>
        <MenuItem onClick={() => handleReset(menu.card)}>
          <RestartAltIcon fontSize="small" sx={{ mr: 1 }} /> İlerlemeyi sıfırla
        </MenuItem>
        <MenuItem onClick={() => handleDelete(menu.card)} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Sil
        </MenuItem>
      </Menu>

      {/* Add / edit card */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isSmall}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span>{editId ? 'Kartı Düzenle' : 'Kart Ekle'}</span>
          <Chip
            icon={<KeyboardIcon fontSize="small" />}
            label="Rusça klavye"
            size="small"
            onClick={toggleKeyboard}
            color={showKeyboard ? 'primary' : 'default'}
            variant={showKeyboard ? 'filled' : 'outlined'}
          />
        </DialogTitle>
        {!editId && (
          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              setActiveField(v === 1 ? 'bulk' : 'front');
            }}
            sx={{ px: 3 }}
          >
            <Tab label="Tekli" />
            <Tab label="Toplu" />
          </Tabs>
        )}
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {tab === 0 || editId ? (
            <>
              <TextField
                label="Ön yüz (soru)"
                value={form.front}
                onChange={(e) => setForm({ ...form, front: capFirst(e.target.value) })}
                onFocus={() => setActiveField('front')}
                fullWidth
                multiline
                minRows={2}
                autoFocus
                slotProps={{
                  input: {
                    endAdornment: form.front.trim() ? (
                      <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <SpeakButton text={form.front} />
                      </InputAdornment>
                    ) : null,
                  },
                }}
              />
              <TextField
                label="Arka yüz (cevap)"
                value={form.back}
                onChange={(e) => setForm({ ...form, back: capFirst(e.target.value) })}
                onFocus={() => setActiveField('back')}
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                label="Not (isteğe bağlı)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: capFirst(e.target.value) })}
                onFocus={() => setActiveField('notes')}
                fullWidth
                multiline
                minRows={1}
              />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Arka plan görseli (isteğe bağlı)
                </Typography>
                <CardImagePicker
                  word={form.front}
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                />
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Her satıra bir kart yaz. Ön ve arka yüzü <strong>Tab</strong>, <code>|</code>, <code>;</code> veya{' '}
                <code>=</code> ile ayır.
              </Typography>
              <TextField
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                onFocus={() => setActiveField('bulk')}
                fullWidth
                multiline
                minRows={6}
                placeholder={'elma = apple\nkitap | book\nev; house'}
                autoFocus
              />
              <Divider />
              <Typography variant="caption" color={bulkParsed.length ? 'success.main' : 'text.secondary'}>
                {bulkParsed.length} geçerli kart algılandı
              </Typography>
            </>
          )}
          {showKeyboard && <CyrillicKeyboard onChar={kbInsert} onBackspace={kbBackspace} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : editId ? (
              'Güncelle'
            ) : tab === 1 ? (
              `${bulkParsed.length} Kart Ekle`
            ) : (
              'Ekle'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
