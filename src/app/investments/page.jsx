'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Tooltip,
  CircularProgress,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import useInvestmentStore from '@/stores/investmentStore';
import { fetchAllPrices, fetchHistoricalPrice } from '@/services/priceService';
import { formatCurrency, getPriceKey, convertBuyPrice } from '@/utils/currency';
import { useAppSettings } from '@/components/AppSettingsContext';

const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Hisse (BIST)' },
  { value: 'stock_us', label: 'Hisse (US)' },
  { value: 'crypto', label: 'Kripto Para' },
  { value: 'gold', label: 'Gram Altin' },
  { value: 'silver', label: 'Gram Gumus' },
  { value: 'forex', label: 'Doviz' },
];

const TYPE_COLORS = {
  stock: 'primary',
  stock_us: 'info',
  crypto: 'warning',
  gold: 'custom',
  silver: 'custom',
  forex: 'success',
};

const CUSTOM_CHIP_STYLES = {
  gold: { bgcolor: '#FFD70033', color: '#B8860B', borderColor: '#DAA520' },
  silver: { bgcolor: '#C0C0C033', color: '#6B6B6B', borderColor: '#A9A9A9' },
};

const SYMBOL_HINTS = {
  stock: 'BIST sembolu (or: THYAO, SISE, ASELS)',
  stock_us: 'US sembolu (or: ADBE, AAPL, MSFT, TSLA)',
  crypto: 'Kripto sembolu (or: BTC, ETH, SOL)',
  gold: 'Otomatik',
  silver: 'Otomatik',
  forex: 'Para birimi (or: USD, EUR, GBP)',
};

const AUTO_SYMBOL_TYPES = {
  gold: 'GOLD',
  silver: 'SILVER',
};

const REFRESH_INTERVAL = 60000;

const emptyLot = { buy_price: '', quantity: '', buy_date: '' };

const emptyForm = {
  name: '',
  type: 'stock_us',
  symbol: '',
  notes: '',
  lots: [{ ...emptyLot }],
};

function LotRow({ lot, index, type, symbol, onChange, onRemove, canRemove }) {
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    if (!symbol || !lot.buy_date || !type) return;
    if (lot._priceFetched === `${symbol}-${lot.buy_date}`) return;
    let cancelled = false;
    setLoadingPrice(true);
    fetchHistoricalPrice(type, symbol, lot.buy_date).then((result) => {
      if (cancelled) return;
      setLoadingPrice(false);
      if (result?.price != null) {
        onChange(index, {
          ...lot,
          buy_price: String(parseFloat(result.price.toFixed(4))),
          _priceFetched: `${symbol}-${lot.buy_date}`,
        });
      }
    });
    return () => { cancelled = true; };
  }, [symbol, type, lot.buy_date]);

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <TextField
        label="Tarih"
        type="date"
        value={lot.buy_date}
        onChange={(e) => onChange(index, { ...lot, buy_date: e.target.value, _priceFetched: undefined })}
        sx={{ flex: 2 }}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label={(type === 'gold' || type === 'silver') ? 'Fiyat (ons)' : 'Fiyat'}
        type="number"
        value={lot.buy_price}
        onChange={(e) => onChange(index, { ...lot, buy_price: e.target.value })}
        sx={{ flex: 2 }}
        size="small"
        helperText={(type === 'gold' || type === 'silver') && lot.buy_price
          ? `≈ ${(parseFloat(lot.buy_price) / 31.1035).toFixed(2)} $/gram`
          : undefined}
        slotProps={{
          input: {
            endAdornment: loadingPrice ? <CircularProgress size={16} /> : null,
          },
        }}
      />
      <TextField
        label="Adet"
        type="number"
        value={lot.quantity}
        onChange={(e) => onChange(index, { ...lot, quantity: e.target.value })}
        sx={{ flex: 1.5 }}
        size="small"
      />
      {canRemove && (
        <IconButton size="small" color="error" onClick={() => onRemove(index)} sx={{ mt: 0.5 }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}

function SortableInvestmentRow({
  inv, prices, priceKey, fmt, currency, rates, loadingPrices, busyIds,
  lotCostConverted, hasPrices, totalCurrentValue, totalCost,
  expandedRow, setExpandedRow, getTypeLabel, handleOpen, handleDelete,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: inv.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const lots = inv.lots || [];
  const totalQty = inv.quantity;
  const totalLotCost = lots.reduce((s, l) => s + lotCostConverted(l, inv.type), 0);
  const avgPrice = totalQty > 0 ? totalLotCost / totalQty : 0;
  const currentPrice = prices[inv.id];
  const currentValue = currentPrice ? currentPrice[priceKey] * totalQty : null;
  const pnl = currentValue !== null ? currentValue - totalLotCost : null;
  const pnlPercent = totalLotCost > 0 && pnl !== null ? (pnl / totalLotCost) * 100 : null;
  const invValue = currentValue !== null ? currentValue : totalLotCost;
  const portfolioTotal = hasPrices ? totalCurrentValue : totalCost;
  const weight = portfolioTotal > 0 ? (invValue / portfolioTotal) * 100 : 0;
  const isExpanded = expandedRow === inv.id;

  return (
    <>
      <TableRow ref={setNodeRef} style={style} hover sx={{ '& > *': { borderBottom: isExpanded ? 'none !important' : undefined } }}>
        <TableCell sx={{ cursor: 'grab', px: 0.5, pl: 2 }} {...attributes} {...listeners}>
          <DragIndicatorIcon fontSize="small" sx={{ color: 'text.disabled', verticalAlign: 'middle' }} />
        </TableCell>
        <TableCell>
          {lots.length > 1 && (
            <IconButton size="small" onClick={() => setExpandedRow(isExpanded ? null : inv.id)}>
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
          {lots.length <= 1 && (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>1</Typography>
          )}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography fontWeight="medium">{inv.name}</Typography>
            {lots.length > 1 && (
              <Chip label={`${lots.length} Pozisyon`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={getTypeLabel(inv.type)}
            size="small"
            variant={CUSTOM_CHIP_STYLES[inv.type] ? 'outlined' : 'filled'}
            color={CUSTOM_CHIP_STYLES[inv.type] ? 'default' : (TYPE_COLORS[inv.type] || 'default')}
            sx={CUSTOM_CHIP_STYLES[inv.type] || {}}
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace">
            {inv.symbol || '-'}
          </Typography>
        </TableCell>
        <TableCell align="right">{fmt(avgPrice)}</TableCell>
        <TableCell align="right">{totalQty}</TableCell>
        <TableCell align="right">{fmt(totalLotCost)}</TableCell>
        <TableCell align="right">
          {currentPrice ? (
            <Typography fontWeight="medium">{fmt(currentPrice[priceKey])}</Typography>
          ) : loadingPrices ? (
            <CircularProgress size={16} />
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell align="right">
          {currentValue !== null ? fmt(currentValue) : '-'}
        </TableCell>
        <TableCell align="right">
          {pnl !== null ? (
            <Box>
              <Typography fontWeight="bold" color={pnl >= 0 ? 'success.main' : 'error.main'}>
                {pnl >= 0 ? '+' : ''}{fmt(pnl)}
              </Typography>
              <Typography variant="caption" color={pnlPercent >= 0 ? 'success.main' : 'error.main'}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </Typography>
            </Box>
          ) : '-'}
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight="medium">%{weight.toFixed(1)}</Typography>
        </TableCell>
        <TableCell align="right">
          {currentPrice?.change24h !== undefined ? (
            <Chip
              icon={currentPrice.change24h >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${currentPrice.change24h >= 0 ? '+' : ''}${currentPrice.change24h.toFixed(2)}%`}
              size="small"
              color={currentPrice.change24h >= 0 ? 'success' : 'error'}
              variant="outlined"
            />
          ) : '-'}
        </TableCell>
        <TableCell align="center">
          <IconButton size="small" onClick={() => handleOpen(inv)} disabled={busyIds.has(inv.id)}>
            <EditIcon fontSize="small" />
          </IconButton>
          {busyIds.has(inv.id) ? (
            <CircularProgress size={20} sx={{ mx: 0.5 }} />
          ) : (
            <IconButton size="small" color="error" onClick={() => handleDelete(inv.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      {lots.length > 1 && (
        <TableRow>
          <TableCell colSpan={14} sx={{ py: 0, px: 0 }}>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ px: 4, py: 1.5, bgcolor: 'action.hover' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lot</TableCell>
                      <TableCell>Tarih</TableCell>
                      <TableCell align="right">Alis Fiyati</TableCell>
                      <TableCell align="right">Adet</TableCell>
                      <TableCell align="right">Maliyet</TableCell>
                      {currentPrice && <TableCell align="right">Kar/Zarar</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lots.map((lot, i) => {
                      const convBuyPrice = convertBuyPrice(lot.buy_price, inv.type, currency, rates);
                      const lotCost = convBuyPrice * lot.quantity;
                      const lotCurrentVal = currentPrice ? currentPrice[priceKey] * lot.quantity : null;
                      const lotPnl = lotCurrentVal !== null ? lotCurrentVal - lotCost : null;
                      const lotPnlPct = lotCost > 0 && lotPnl !== null ? (lotPnl / lotCost) * 100 : null;
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <Chip label={`#${i + 1}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                          </TableCell>
                          <TableCell>{lot.buy_date || '-'}</TableCell>
                          <TableCell align="right">{fmt(convBuyPrice)}</TableCell>
                          <TableCell align="right">{lot.quantity}</TableCell>
                          <TableCell align="right">{fmt(lotCost)}</TableCell>
                          {currentPrice && (
                            <TableCell align="right">
                              {lotPnl !== null ? (
                                <Typography variant="body2" fontWeight="bold" color={lotPnl >= 0 ? 'success.main' : 'error.main'}>
                                  {lotPnl >= 0 ? '+' : ''}{fmt(lotPnl)} ({lotPnlPct >= 0 ? '+' : ''}{lotPnlPct.toFixed(2)}%)
                                </Typography>
                              ) : '-'}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function InvestmentsPage() {
  const { currency } = useAppSettings();
  const fmt = (value) => formatCurrency(value, currency);
  const priceKey = getPriceKey(currency);
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { investments, loading, saving, busyIds, fetchInvestments, addInvestment, updateInvestment, deleteInvestment } =
    useInvestmentStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [prices, setPrices] = useState({});
  const [rates, setRates] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [rowOrder, setRowOrder] = useState([]);
  const intervalRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('velora_row_order'));
      if (Array.isArray(saved)) setRowOrder(saved);
    } catch {}
  }, []);

  const refreshPrices = useCallback(async () => {
    if (investments.length === 0) return;
    setLoadingPrices(true);
    try {
      const result = await fetchAllPrices(investments);
      setPrices(result.prices);
      setRates(result.rates);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Price fetch error:', e);
    }
    setLoadingPrices(false);
  }, [investments]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  useEffect(() => {
    if (investments.length > 0) {
      refreshPrices();
    }
  }, [investments.length]);

  useEffect(() => {
    intervalRef.current = setInterval(refreshPrices, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [refreshPrices]);

  const handleOpen = (investment = null) => {
    if (investment) {
      setEditId(investment.id);
      const lots = (investment.lots && investment.lots.length > 0)
        ? investment.lots.map((l) => ({
            buy_price: String(l.buy_price),
            quantity: String(l.quantity),
            buy_date: l.buy_date || '',
            _priceFetched: l.buy_date ? `${investment.symbol}-${l.buy_date}` : undefined,
          }))
        : [{ buy_price: String(investment.buy_price), quantity: String(investment.quantity), buy_date: '' }];
      setForm({
        name: investment.name,
        type: investment.type,
        symbol: investment.symbol || '',
        notes: investment.notes || '',
        lots,
      });
    } else {
      setEditId(null);
      const defaultType = emptyForm.type;
      const autoSymbol = AUTO_SYMBOL_TYPES[defaultType];
      setForm({ ...emptyForm, lots: [{ ...emptyLot }], symbol: autoSymbol || '' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    setForm({ ...emptyForm, lots: [{ ...emptyLot }] });
  };

  const handleLotChange = (index, updatedLot) => {
    const newLots = [...form.lots];
    newLots[index] = updatedLot;
    setForm({ ...form, lots: newLots });
  };

  const handleAddLot = () => {
    setForm({ ...form, lots: [...form.lots, { ...emptyLot }] });
  };

  const handleRemoveLot = (index) => {
    setForm({ ...form, lots: form.lots.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    const lots = form.lots
      .filter((l) => l.quantity && parseFloat(l.quantity) > 0)
      .map((l) => ({
        buy_price: parseFloat(l.buy_price) || 0,
        quantity: parseFloat(l.quantity) || 0,
        buy_date: l.buy_date || null,
      }));

    const data = {
      name: form.name,
      type: form.type,
      symbol: form.symbol,
      notes: form.notes,
      lots,
    };

    if (editId) {
      await updateInvestment(editId, data);
    } else {
      await addInvestment(data);
    }
    handleClose();
  };

  const handleDelete = async (id) => {
    if (confirm('Bu yatirimi silmek istediginize emin misiniz?')) {
      await deleteInvestment(id);
    }
  };

  const getTypeLabel = (type) =>
    INVESTMENT_TYPES.find((t) => t.value === type)?.label || type;

  const lotCostConverted = (lot, type) =>
    convertBuyPrice(lot.buy_price, type, currency, rates) * lot.quantity;

  const totalCost = investments.reduce((sum, inv) => {
    const lots = inv.lots || [];
    return sum + lots.reduce((s, l) => s + lotCostConverted(l, inv.type), 0);
  }, 0);

  const totalCurrentValue = investments.reduce((sum, inv) => {
    const price = prices[inv.id];
    const lots = inv.lots || [];
    const fallbackCost = lots.reduce((s, l) => s + lotCostConverted(l, inv.type), 0);
    return sum + (price ? price[priceKey] * inv.quantity : fallbackCost);
  }, 0);

  const totalPnl = totalCurrentValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const hasPrices = Object.keys(prices).length > 0;

  const sortedInvestments = [...investments].sort((a, b) => {
    const ia = rowOrder.indexOf(a.id);
    const ib = rowOrder.indexOf(b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sortedInvestments.map((inv) => inv.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    const newOrder = arrayMove(ids, oldIndex, newIndex);
    setRowOrder(newOrder);
    localStorage.setItem('velora_row_order', JSON.stringify(newOrder));
  };

  if (loading) {
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
          Yatirimlar
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Son guncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
            </Typography>
          )}
          <Tooltip title="Fiyatlari guncelle">
            <IconButton onClick={refreshPrices} disabled={loadingPrices}>
              {loadingPrices ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} size="small">
            Yeni Yatirim
          </Button>
        </Box>
      </Box>

      {investments.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">Toplam Maliyet</Typography>
                <Typography variant="h6" fontWeight="bold">{fmt(totalCost)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">Guncel Deger</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {hasPrices ? fmt(totalCurrentValue) : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">Toplam Kar/Zarar</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {hasPrices ? (
                    <>
                      {totalPnl >= 0 ? (
                        <TrendingUpIcon color="success" fontSize="small" />
                      ) : (
                        <TrendingDownIcon color="error" fontSize="small" />
                      )}
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color={totalPnl >= 0 ? 'success.main' : 'error.main'}
                      >
                        {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)} ({totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%)
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="h6">-</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Card sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell width={30} />
                  <TableCell width={30} />
                  <TableCell>Ad</TableCell>
                  <TableCell>Tur</TableCell>
                  <TableCell>Sembol</TableCell>
                  <TableCell align="right">Ort. Maliyet</TableCell>
                  <TableCell align="right">Toplam Adet</TableCell>
                  <TableCell align="right">Maliyet</TableCell>
                  <TableCell align="right">Guncel Fiyat</TableCell>
                  <TableCell align="right">Guncel Deger</TableCell>
                  <TableCell align="right">Kar/Zarar</TableCell>
                  <TableCell align="right">Agirlik</TableCell>
                  <TableCell align="right">24s Degisim</TableCell>
                  <TableCell align="center">Islem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedInvestments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Henuz yatirim eklenmedi. "Yeni Yatirim" butonuna tiklayin.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext items={sortedInvestments.map((inv) => inv.id)} strategy={verticalListSortingStrategy}>
                    {sortedInvestments.map((inv) => (
                      <SortableInvestmentRow
                        key={inv.id}
                        inv={inv}
                        prices={prices}
                        priceKey={priceKey}
                        fmt={fmt}
                        currency={currency}
                        rates={rates}
                        loadingPrices={loadingPrices}
                        busyIds={busyIds}
                        lotCostConverted={lotCostConverted}
                        hasPrices={hasPrices}
                        totalCurrentValue={totalCurrentValue}
                        totalCost={totalCost}
                        expandedRow={expandedRow}
                        setExpandedRow={setExpandedRow}
                        getTypeLabel={getTypeLabel}
                        handleOpen={handleOpen}
                        handleDelete={handleDelete}
                      />
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </TableContainer>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isSmall}>
        <DialogTitle>{editId ? 'Yatirimi Duzenle' : 'Yeni Yatirim Ekle'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Yatirim Adi"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
          />
          <TextField
            select
            label="Tur"
            value={form.type}
            onChange={(e) => {
              const newType = e.target.value;
              const autoSymbol = AUTO_SYMBOL_TYPES[newType];
              setForm({ ...form, type: newType, symbol: autoSymbol || (AUTO_SYMBOL_TYPES[form.type] ? '' : form.symbol) });
            }}
            fullWidth
          >
            {INVESTMENT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          {!AUTO_SYMBOL_TYPES[form.type] && (
            <TextField
              label="Sembol"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              fullWidth
              helperText={SYMBOL_HINTS[form.type]}
            />
          )}

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Pozisyonlar ({form.lots.length})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddLot}>
              Pozisyon Ekle
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {form.lots.map((lot, i) => (
              <Box key={i}>
                {i > 0 && <Divider sx={{ mb: 1.5 }} />}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Chip label={`Pozisyon #${i + 1}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
                <LotRow
                  lot={lot}
                  index={i}
                  type={form.type}
                  symbol={form.symbol}
                  onChange={handleLotChange}
                  onRemove={handleRemoveLot}
                  canRemove={form.lots.length > 1}
                />
              </Box>
            ))}
          </Box>

          {form.lots.length > 1 && (
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Toplam: {form.lots.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0)} adet
                {' | '}Ort. Maliyet: {(() => {
                  const totalQ = form.lots.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0);
                  const totalC = form.lots.reduce((s, l) => s + (parseFloat(l.buy_price) || 0) * (parseFloat(l.quantity) || 0), 0);
                  return totalQ > 0 ? fmt(totalC / totalQ) : '-';
                })()}
              </Typography>
            </Box>
          )}

          <TextField
            label="Notlar"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Iptal</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name || form.lots.every((l) => !l.quantity) || saving}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : (editId ? 'Guncelle' : 'Ekle')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
