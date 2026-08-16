'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
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
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import StyleIcon from '@mui/icons-material/Style';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import useFlashcardStore from '@/stores/flashcardStore';
import LangKeyboard from '@/components/LangKeyboard';
import SpeakButton from '@/components/SpeakButton';
import CardImagePicker from '@/components/CardImagePicker';
import EmptyState from '@/components/ui/EmptyState';
import { resolveDeckColor, stageMeta } from '@/lib/flashcardConstants';
import { getLanguage } from '@/lib/languages';

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
  // Klavye, seslendirme ve görsel araması destenin diline göre çalışır.
  const language = getLanguage(deck?.lang);

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

  const color = resolveDeckColor(deck?.color, theme.palette.mode);
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
          <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: color, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Typography variant="h4" component="h1" noWrap>
                {deck ? deck.name : 'Deste'}
              </Typography>
              {deck && <Chip size="small" label={language.label} variant="outlined" />}
            </Box>
            <Typography variant="body2" color="text.secondary" noWrap>
              {deck?.description || `${cards.length} kart`}
            </Typography>
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
            Kart ekle
          </Button>
        </Box>
      </Box>

      {/* Cards */}
      {cardsLoading && cards.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<StyleIcon />}
          title="Bu destede henüz kart yok"
          description="Tek tek ya da toplu olarak kart ekleyerek başla."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              İlk kartı ekle
            </Button>
          }
        />
      ) : (
        <>
          <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
            {cards.length} kart
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {cards.map((card) => {
              const stage = stageMeta(card.status, theme.palette.mode);
              const busy = busyIds.has(card.id);
              return (
                <Card
                  key={card.id}
                  sx={{ opacity: busy ? 0.5 : 1, '&:hover': { borderColor: 'primary.main' } }}
                >
                  <Box sx={{ display: 'flex', gap: 1.5, p: 2, minWidth: 0 }}>
                    {/* Aşama göstergesi: renk noktası her zaman yazılı etiketle birlikte */}
                    <Tooltip title={stage.label}>
                      <Box
                        sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: stage.color, mt: 0.75, flexShrink: 0 }}
                      />
                    </Tooltip>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Typography sx={{ fontWeight: 650, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {card.front}
                        </Typography>
                        <SpeakButton text={card.front} lang={language.speech} sx={{ p: 0.25 }} />
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {card.back}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {stage.label} · {formatDue(card.due_date)}
                          {card.repetitions > 0 && ` · ${card.repetitions}× tekrar`}
                          {card.lapses > 0 && ` · ${card.lapses}× unutuldu`}
                        </Typography>
                        {card.leech && (
                          <Chip
                            size="small"
                            variant="outlined"
                            icon={<LocalFireDepartmentIcon sx={{ fontSize: 14 }} />}
                            label="İnatçı"
                            sx={{
                              height: 20,
                              color: 'error.main',
                              borderColor: 'error.main',
                              fontWeight: 650,
                              '& .MuiChip-icon': { color: 'inherit' },
                            }}
                          />
                        )}
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
          <span>{editId ? 'Kartı düzenle' : 'Kart ekle'}</span>
          <Chip
            icon={<KeyboardIcon fontSize="small" />}
            label={language.keyboardLabel}
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
                        <SpeakButton text={form.front} lang={language.speech} />
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
                  from={language.code}
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
          {showKeyboard && <LangKeyboard lang={language.code} onChar={kbInsert} onBackspace={kbBackspace} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : editId ? (
              'Güncelle'
            ) : tab === 1 ? (
              `${bulkParsed.length} kart ekle`
            ) : (
              'Ekle'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
