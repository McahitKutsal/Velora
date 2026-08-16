'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Grid,
  Typography,
  Chip,
  Button,
  CircularProgress,
  useTheme,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ChecklistIcon from '@mui/icons-material/Checklist';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import useInvestmentStore from '@/stores/investmentStore';
import useTodoStore from '@/stores/todoStore';
import useFlashcardStore from '@/stores/flashcardStore';
import { fetchAllPrices, fetchPriceHistory } from '@/services/priceService';
import { formatCurrency, getPriceKey, convertBuyPrice } from '@/utils/currency';
import { useAppSettings } from '@/components/AppSettingsContext';
import PageHeader from '@/components/ui/PageHeader';
import StatTile from '@/components/ui/StatTile';
import SectionCard from '@/components/ui/SectionCard';
import { ChartTooltip, ChartLegend, useChartTokens } from '@/components/ui/ChartKit';

const TYPE_LABELS = {
  stock: 'Hisse (BIST)',
  stock_us: 'Hisse (US)',
  crypto: 'Kripto',
  gold: 'Kıymetli Maden',
  silver: 'Kıymetli Maden',
  forex: 'Döviz',
};

const PRIORITY_LABELS = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };

export default function DashboardPage() {
  const router = useRouter();
  const theme = useTheme();
  const chart = useChartTokens();
  const { currency } = useAppSettings();
  const { investments, loading: loadingInvestments, fetchInvestments } = useInvestmentStore();
  const { todos, loading: loadingTodos, fetchTodos } = useTodoStore();
  const { stats: flashStats, fetchStats: fetchFlashStats } = useFlashcardStore();
  const [prices, setPrices] = useState({});
  const [rates, setRates] = useState(null);
  const [priceHistories, setPriceHistories] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const fmt = (value) => formatCurrency(value, currency);
  const priceKey = getPriceKey(currency);

  useEffect(() => {
    fetchInvestments();
    fetchTodos();
    fetchFlashStats();
  }, [fetchInvestments, fetchTodos, fetchFlashStats]);

  useEffect(() => {
    if (investments.length > 0) {
      fetchAllPrices(investments).then((result) => {
        setPrices(result.prices);
        setRates(result.rates);
      });
    }
  }, [investments.length]);

  useEffect(() => {
    if (investments.length === 0) return;
    let earliest = null;
    investments.forEach((inv) => {
      (inv.lots || []).forEach((lot) => {
        if (lot.buy_date && (!earliest || lot.buy_date < earliest)) {
          earliest = lot.buy_date;
        }
      });
    });
    if (!earliest) return;

    setLoadingTimeline(true);
    const today = new Date().toISOString().split('T')[0];

    Promise.all(
      investments.map(async (inv) => {
        if (!inv.symbol) return { id: inv.id, history: {} };
        const history = await fetchPriceHistory(inv.type, inv.symbol, earliest, today);
        return { id: inv.id, type: inv.type, history };
      })
    ).then((results) => {
      const histories = {};
      results.forEach((r) => { histories[r.id] = r; });
      setPriceHistories(histories);
      setLoadingTimeline(false);
    });
  }, [investments.length]);

  const getInvCost = (inv) => {
    const lots = inv.lots || [];
    if (lots.length > 0) {
      return lots.reduce((s, l) => s + convertBuyPrice(l.buy_price, inv.type, currency, rates) * l.quantity, 0);
    }
    return convertBuyPrice(inv.buy_price, inv.type, currency, rates) * inv.quantity;
  };

  const totalCost = investments.reduce((sum, inv) => sum + getInvCost(inv), 0);
  const hasPrices = Object.keys(prices).length > 0;

  const totalCurrentValue = investments.reduce((sum, inv) => {
    const price = prices[inv.id];
    return sum + (price ? price[priceKey] * inv.quantity : getInvCost(inv));
  }, 0);

  const totalPnl = totalCurrentValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const investmentsByType = investments.reduce((acc, inv) => {
    const label = TYPE_LABELS[inv.type] || inv.type;
    const price = prices[inv.id];
    const value = price ? price[priceKey] * inv.quantity : getInvCost(inv);
    const existing = acc.find((a) => a.name === label);
    if (existing) {
      existing.value += value;
    } else {
      acc.push({ name: label, value });
    }
    return acc;
  }, []);

  const pnlData = investments
    .filter((inv) => prices[inv.id])
    .map((inv) => {
      const cost = getInvCost(inv);
      const current = prices[inv.id][priceKey] * inv.quantity;
      const pnl = current - cost;
      const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
      return {
        name: inv.name,
        symbol: inv.symbol,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2)),
      };
    })
    .sort((a, b) => b.pnl - a.pnl);

  const portfolioTimeline = useMemo(() => {
    if (!priceHistories || !rates) return [];

    const lotEvents = [];
    investments.forEach((inv) => {
      (inv.lots || []).forEach((lot) => {
        if (lot.buy_date) {
          lotEvents.push({
            date: lot.buy_date,
            invId: inv.id,
            type: inv.type,
            quantity: lot.quantity,
            cost: convertBuyPrice(lot.buy_price, inv.type, currency, rates) * lot.quantity,
          });
        }
      });
    });
    if (lotEvents.length === 0) return [];
    lotEvents.sort((a, b) => a.date.localeCompare(b.date));

    const allDatesSet = new Set();
    lotEvents.forEach((e) => allDatesSet.add(e.date));
    Object.values(priceHistories).forEach((inv) => {
      Object.keys(inv.history).forEach((d) => allDatesSet.add(d));
    });
    const allDates = [...allDatesSet].sort();
    if (allDates.length === 0) return [];

    let cumCost = 0;
    let lotIdx = 0;

    const getHistPrice = (invId, date) => {
      const inv = priceHistories[invId];
      if (!inv?.history) return null;
      if (inv.history[date]) return inv.history[date];
      const dates = Object.keys(inv.history).sort();
      let best = null;
      for (const d of dates) {
        if (d <= date) best = d;
        else break;
      }
      return best ? inv.history[best] : null;
    };

    const convertHistPrice = (rawPrice, priceCurrency, type) => {
      let tryPrice = rawPrice;
      if (priceCurrency === 'USD' && rates.usdtry) tryPrice = rawPrice * rates.usdtry;
      else if (priceCurrency === 'EUR' && rates.eurtry) tryPrice = rawPrice * rates.eurtry;
      if (type === 'gold' || type === 'silver') tryPrice = tryPrice / 31.1035;
      if (currency === 'TRY') return tryPrice;
      if (currency === 'USD' && rates.usdtry) return tryPrice / rates.usdtry;
      if (currency === 'EUR' && rates.eurtry) return tryPrice / rates.eurtry;
      return tryPrice;
    };

    const timeline = [];
    const sampleDates = new Set();
    lotEvents.forEach((e) => sampleDates.add(e.date));
    const startDate = new Date(allDates[0]);
    const endDate = new Date();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      sampleDates.add(d.toISOString().split('T')[0]);
    }
    sampleDates.add(new Date().toISOString().split('T')[0]);
    const sortedSamples = [...sampleDates].sort();

    lotIdx = 0;
    const activeHoldings = {};

    for (const date of sortedSamples) {
      while (lotIdx < lotEvents.length && lotEvents[lotIdx].date <= date) {
        const e = lotEvents[lotIdx];
        if (!activeHoldings[e.invId]) {
          activeHoldings[e.invId] = { totalQty: 0, totalCost: 0, type: e.type };
        }
        activeHoldings[e.invId].totalQty += e.quantity;
        activeHoldings[e.invId].totalCost += e.cost;
        cumCost = Object.values(activeHoldings).reduce((s, h) => s + h.totalCost, 0);
        lotIdx++;
      }

      if (Object.keys(activeHoldings).length === 0) continue;

      const isToday = date === new Date().toISOString().split('T')[0];
      let portfolioValue = 0;
      for (const [invId, holding] of Object.entries(activeHoldings)) {
        if (isToday && prices[invId]) {
          portfolioValue += prices[invId][priceKey] * holding.totalQty;
        } else {
          const histPrice = getHistPrice(invId, date);
          if (histPrice) {
            const converted = convertHistPrice(histPrice.price, histPrice.currency, holding.type);
            portfolioValue += converted * holding.totalQty;
          } else {
            portfolioValue += holding.totalCost;
          }
        }
      }

      timeline.push({
        date,
        label: date === new Date().toISOString().split('T')[0]
          ? 'Bugün'
          : new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: '2-digit' }),
        maliyet: parseFloat(cumCost.toFixed(2)),
        deger: parseFloat(portfolioValue.toFixed(2)),
      });
    }

    return timeline;
  }, [investments, priceHistories, rates, currency, prices, priceKey]);

  const dailyChangeData = investments
    .filter((inv) => prices[inv.id]?.change24h !== undefined)
    .map((inv) => ({
      name: inv.symbol || inv.name,
      change: parseFloat(prices[inv.id].change24h.toFixed(2)),
    }))
    .sort((a, b) => b.change - a.change);

  const topPerformers = [...pnlData].sort((a, b) => b.pnlPercent - a.pnlPercent).slice(0, 3);
  const worstPerformers = [...pnlData].sort((a, b) => a.pnlPercent - b.pnlPercent).slice(0, 3);

  const activeTodos = todos.filter((t) => !t.completed).length;
  const completedTodos = todos.filter((t) => t.completed).length;

  const delta = theme.palette.data.delta;
  const pnlTone = totalPnl >= 0 ? delta.up : delta.down;

  if (loadingInvestments || loadingTodos) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  const signed = (v) => `${v >= 0 ? '+' : ''}${fmt(v)}`;
  const signedPct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

  /* --------------------------- charts --------------------------- */

  const TimelineTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const pnl = d.deger != null ? d.deger - d.maliyet : null;
    return (
      <ChartTooltip
        title={label}
        rows={[
          ...(d.deger != null ? [{ color: chart.colors[2], label: 'Piyasa değeri', value: fmt(d.deger) }] : []),
          { color: chart.colors[0], label: 'Maliyet', value: fmt(d.maliyet) },
          ...(pnl != null ? [{ label: 'Fark', value: signed(pnl) }] : []),
        ]}
      />
    );
  };

  // Varlık dağılımı: pasta yerine bileşim çubuğu — dilim etiketleri çakışmaz,
  // her parça lejantta adı ve değeriyle birlikte okunur.
  const totalByType = investmentsByType.reduce((s, d) => s + d.value, 0);
  const composition = [...investmentsByType]
    .sort((a, b) => b.value - a.value)
    .map((d, i) => ({ ...d, color: chart.colors[i % chart.colors.length] }));

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle={
          hasPrices
            ? `Portföy ${signed(totalPnl)} (${signedPct(totalPnlPercent)})`
            : 'Fiyatlar yükleniyor…'
        }
      />

      {/* Özet */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile icon={<AccountBalanceWalletIcon />} label="Toplam maliyet" value={fmt(totalCost)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile icon={<ShowChartIcon />} label="Güncel değer" value={hasPrices ? fmt(totalCurrentValue) : '—'} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            icon={totalPnl >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label="Kâr / zarar"
            value={hasPrices ? signed(totalPnl) : '—'}
            hint={hasPrices ? signedPct(totalPnlPercent) : null}
            tone={hasPrices ? pnlTone : undefined}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            icon={<ChecklistIcon />}
            label="Aktif görev"
            value={activeTodos}
            hint={`${completedTodos} tamamlandı`}
            onClick={() => router.push('/todos')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Zaman çizelgesi */}
        {(portfolioTimeline.length > 1 || loadingTimeline) && (
          <Grid size={{ xs: 12 }}>
            <SectionCard title="Portföy zaman çizelgesi">
              {loadingTimeline ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={portfolioTimeline} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="fillDeger" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chart.colors[2]} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={chart.colors[2]} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fillMaliyet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chart.colors[0]} stopOpacity={0.18} />
                          <stop offset="100%" stopColor={chart.colors[0]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...chart.grid} />
                      <XAxis dataKey="label" {...chart.axis} minTickGap={28} />
                      <YAxis {...chart.axis} width={64} tickFormatter={(v) => fmt(v)} />
                      <Tooltip content={<TimelineTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="deger"
                        name="Piyasa değeri"
                        stroke={chart.colors[2]}
                        fill="url(#fillDeger)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: chart.surface }}
                      />
                      <Area
                        type="monotone"
                        dataKey="maliyet"
                        name="Maliyet"
                        stroke={chart.colors[0]}
                        fill="url(#fillMaliyet)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: chart.surface }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <ChartLegend
                    items={[
                      { label: 'Piyasa değeri', color: chart.colors[2] },
                      { label: 'Maliyet', color: chart.colors[0] },
                    ]}
                  />
                </>
              )}
            </SectionCard>
          </Grid>
        )}

        {/* Varlık dağılımı */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title={`Varlık dağılımı ${hasPrices ? '(güncel)' : '(maliyet)'}`}>
            {composition.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', gap: '2px', height: 12, borderRadius: 999, overflow: 'hidden', mb: 2 }}>
                  {composition.map((d) => (
                    <Box key={d.name} sx={{ width: `${(d.value / totalByType) * 100}%`, bgcolor: d.color }} />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {composition.map((d) => (
                    <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: d.color, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ mr: 'auto' }}>
                        {d.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" className="num">
                        %{((d.value / totalByType) * 100).toFixed(0)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 650, minWidth: 92, textAlign: 'right' }} className="num">
                        {fmt(d.value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Typography color="text.secondary" variant="body2" sx={{ py: 6, textAlign: 'center' }}>
                Henüz yatırım eklenmedi
              </Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Kâr/zarar */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Yatırım kâr/zarar">
            {pnlData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, pnlData.length * 34)}>
                <BarChart data={pnlData} layout="vertical" margin={{ left: 0, right: 8 }} barCategoryGap="28%">
                  <CartesianGrid {...chart.grid} horizontal={false} vertical />
                  <XAxis type="number" {...chart.axis} tickFormatter={(v) => fmt(v)} />
                  <YAxis type="category" dataKey="name" width={104} {...chart.axis} />
                  <Tooltip
                    cursor={{ fill: chart.cursor.fill }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <ChartTooltip
                          title={payload[0].payload.name}
                          rows={[
                            { label: 'Kâr/zarar', value: signed(payload[0].payload.pnl) },
                            { label: 'Oran', value: signedPct(payload[0].payload.pnlPercent) },
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="pnl" barSize={14} radius={[0, 4, 4, 0]}>
                    {pnlData.map((e, i) => (
                      <Cell key={i} fill={e.pnl >= 0 ? delta.up : delta.down} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" variant="body2" sx={{ py: 6, textAlign: 'center' }}>
                Fiyat verisi bekleniyor…
              </Typography>
            )}
          </SectionCard>
        </Grid>

        {/* En iyi / en kötü */}
        {pnlData.length > 0 && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="En çok kazandıranlar">
                <PerformerList items={topPerformers} fmt={fmt} delta={delta} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="En çok kaybettirenler">
                <PerformerList items={worstPerformers} fmt={fmt} delta={delta} />
              </SectionCard>
            </Grid>
          </>
        )}

        {/* Günlük değişim */}
        {dailyChangeData.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Günlük değişim (24s)">
              <ResponsiveContainer width="100%" height={Math.max(200, dailyChangeData.length * 34)}>
                <BarChart data={dailyChangeData} layout="vertical" margin={{ left: 0, right: 8 }} barCategoryGap="28%">
                  <CartesianGrid {...chart.grid} horizontal={false} vertical />
                  <XAxis type="number" {...chart.axis} tickFormatter={(v) => `%${v}`} />
                  <YAxis type="category" dataKey="name" width={72} {...chart.axis} />
                  <Tooltip
                    cursor={{ fill: chart.cursor.fill }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <ChartTooltip
                          title={payload[0].payload.name}
                          rows={[{ label: '24 saat', value: signedPct(payload[0].payload.change) }]}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="change" barSize={14} radius={[0, 4, 4, 0]}>
                    {dailyChangeData.map((e, i) => (
                      <Cell key={i} fill={e.change >= 0 ? delta.up : delta.down} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </Grid>
        )}

        {/* Kart tekrarı */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Kart tekrarı"
            action={
              <Button size="small" color="inherit" onClick={() => router.push('/flashcards')}>
                Tümü
              </Button>
            }
          >
            {flashStats && flashStats.totalCards > 0 ? (
              <>
                <Box sx={{ display: 'flex', gap: 4, mb: 2.5 }}>
                  {[
                    { v: flashStats.due, l: 'tekrara hazır', tone: flashStats.due > 0 ? 'primary.main' : 'text.primary' },
                    { v: flashStats.reviewedToday, l: 'bugün çalışıldı' },
                    { v: flashStats.streak, l: 'gün serisi' },
                  ].map((x) => (
                    <Box key={x.l}>
                      <Typography variant="h5" component="p" className="num" sx={{ color: x.tone || 'text.primary', lineHeight: 1.1 }}>
                        {x.v}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {x.l}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {flashStats.due > 0 ? (
                  <Button variant="contained" fullWidth startIcon={<BoltIcon />} onClick={() => router.push('/flashcards/all/study')}>
                    Çalışmaya başla · {flashStats.due}
                  </Button>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    Bugünlük tüm kartlar güncel.
                  </Typography>
                )}
              </>
            ) : (
              <Box sx={{ py: 2 }}>
                <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                  Henüz kart yok. Aralıklı tekrarla öğrenmeye başla.
                </Typography>
                <Button variant="outlined" onClick={() => router.push('/flashcards')}>
                  Kartlara git
                </Button>
              </Box>
            )}
          </SectionCard>
        </Grid>

        {/* Aktif görevler */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Aktif görevler"
            action={
              <Button size="small" color="inherit" onClick={() => router.push('/todos')}>
                Tümü
              </Button>
            }
          >
            {todos.filter((t) => !t.completed).length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {todos
                  .filter((t) => !t.completed)
                  .slice(0, 5)
                  .map((todo, i) => (
                    <Box
                      key={todo.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1.25,
                        borderTop: i ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" noWrap>
                        {todo.title}
                      </Typography>
                      <Chip
                        label={PRIORITY_LABELS[todo.priority] || todo.priority}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 20,
                          flexShrink: 0,
                          color: todo.priority === 'high' ? 'error.main' : 'text.secondary',
                          borderColor: todo.priority === 'high' ? 'error.main' : 'divider',
                        }}
                      />
                    </Box>
                  ))}
              </Box>
            ) : (
              <Typography color="text.secondary" variant="body2" sx={{ py: 4, textAlign: 'center' }}>
                Tüm görevler tamamlandı.
              </Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}

/** Kazandıran/kaybettiren listesi — değer sağda, hizalı. */
function PerformerList({ items, fmt, delta }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => {
        const tone = item.pnl >= 0 ? delta.up : delta.down;
        return (
          <Box
            key={item.name}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1.5,
              py: 1.25,
              borderTop: i ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {item.name}
              </Typography>
              {item.symbol && (
                <Typography variant="caption" color="text.secondary">
                  {item.symbol}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: tone }} className="num">
                {item.pnl >= 0 ? '+' : ''}
                {fmt(item.pnl)}
              </Typography>
              <Typography variant="caption" sx={{ color: tone }} className="num">
                {item.pnlPercent >= 0 ? '+' : ''}
                {item.pnlPercent.toFixed(2)}%
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
