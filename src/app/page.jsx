'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ChecklistIcon from '@mui/icons-material/Checklist';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StyleIcon from '@mui/icons-material/Style';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import useInvestmentStore from '@/stores/investmentStore';
import useTodoStore from '@/stores/todoStore';
import useFlashcardStore from '@/stores/flashcardStore';
import { fetchAllPrices, fetchPriceHistory } from '@/services/priceService';
import { formatCurrency, getPriceKey, convertBuyPrice } from '@/utils/currency';
import { useAppSettings } from '@/components/AppSettingsContext';

const TYPE_LABELS = {
  stock: 'Hisse (BIST)',
  stock_us: 'Hisse (US)',
  crypto: 'Kripto',
  gold: 'Kıymetli Maden',
  silver: 'Kıymetli Maden',
  forex: 'Döviz',
};

const COLORS = ['#1976d2', '#f57c00', '#fdd835', '#4caf50', '#9c27b0', '#00bcd4', '#e91e63', '#607d8b'];

export default function DashboardPage() {
  const router = useRouter();
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

  const summaryCards = [
    {
      title: 'Toplam Maliyet',
      value: fmt(totalCost),
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Güncel Değer',
      value: hasPrices ? fmt(totalCurrentValue) : '-',
      icon: <ShowChartIcon sx={{ fontSize: 40 }} />,
      color: '#f57c00',
    },
    {
      title: 'Kar/Zarar',
      value: hasPrices ? `${totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}` : '-',
      subtitle: hasPrices ? `${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%` : null,
      icon: totalPnl >= 0 ? <TrendingUpIcon sx={{ fontSize: 40 }} /> : <TrendingDownIcon sx={{ fontSize: 40 }} />,
      color: totalPnl >= 0 ? '#4caf50' : '#f44336',
    },
    {
      title: 'Aktif Görevler',
      value: activeTodos,
      subtitle: `${completedTodos} tamamlandı`,
      icon: <ChecklistIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
    },
  ];

  if (loadingInvestments || loadingTodos) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const CustomBarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, boxShadow: 2 }}>
        <Typography variant="body2" fontWeight="bold">{data.name}</Typography>
        <Typography variant="body2" color={data.pnl >= 0 ? 'success.main' : 'error.main'}>
          {data.pnl >= 0 ? '+' : ''}{fmt(data.pnl)} ({data.pnlPercent >= 0 ? '+' : ''}{data.pnlPercent}%)
        </Typography>
      </Box>
    );
  };

  const TimelineTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const pnl = data.deger != null ? data.deger - data.maliyet : null;
    const pnlPct = pnl != null && data.maliyet > 0 ? (pnl / data.maliyet) * 100 : null;
    return (
      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, boxShadow: 2 }}>
        <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>{label}</Typography>
        {data.deger != null && (
          <Typography variant="body2" sx={{ color: '#4caf50' }}>
            Piyasa Değeri: {fmt(data.deger)}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: '#1976d2' }}>
          Maliyet: {fmt(data.maliyet)}
        </Typography>
        {pnl != null && (
          <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }} color={pnl >= 0 ? 'success.main' : 'error.main'}>
            {pnl >= 0 ? '+' : ''}{fmt(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.title}>
            <Card sx={{ height: '100%' }}>
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    {card.title}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {card.value}
                  </Typography>
                  {card.subtitle && (
                    <Typography variant="caption" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ color: card.color }}>{card.icon}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {(portfolioTimeline.length > 1 || loadingTimeline) && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Portföy Zaman Çizelgesi
                </Typography>
                {loadingTimeline && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} />
                  </Box>
                )}
                {!loadingTimeline && portfolioTimeline.length > 1 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={portfolioTimeline}>
                      <defs>
                        <linearGradient id="colorMaliyet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorDeger" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis tickFormatter={(v) => fmt(v)} fontSize={12} />
                      <Tooltip content={<TimelineTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="deger"
                        name="Piyasa Değeri"
                        stroke="#4caf50"
                        fill="url(#colorDeger)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="maliyet"
                        name="Maliyet"
                        stroke="#1976d2"
                        fill="url(#colorMaliyet)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Varlık Türü Dağılımı {hasPrices ? '(Güncel)' : '(Maliyet)'}
              </Typography>
              {investmentsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={investmentsByType}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {investmentsByType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => fmt(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
                  Henüz yatırım eklenmedi
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {pnlData.length > 0 && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <EmojiEventsIcon sx={{ color: '#4caf50' }} />
                    <Typography variant="h6">En Çok Kazandıranlar</Typography>
                  </Box>
                  {topPerformers.map((item, i) => (
                    <Box
                      key={item.name}
                      sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        p: 1.5, borderRadius: 1, bgcolor: 'action.hover', mb: i < topPerformers.length - 1 ? 1 : 0,
                      }}
                    >
                      <Box>
                        <Typography fontWeight="medium">{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.symbol}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight="bold" color="success.main">
                          +{fmt(item.pnl)}
                        </Typography>
                        <Typography variant="caption" color="success.main">
                          +{item.pnlPercent.toFixed(2)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingDownIcon sx={{ color: '#f44336' }} />
                    <Typography variant="h6">En Çok Kaybettirenler</Typography>
                  </Box>
                  {worstPerformers.map((item, i) => (
                    <Box
                      key={item.name}
                      sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        p: 1.5, borderRadius: 1, bgcolor: 'action.hover', mb: i < worstPerformers.length - 1 ? 1 : 0,
                      }}
                    >
                      <Box>
                        <Typography fontWeight="medium">{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.symbol}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight="bold" color={item.pnl >= 0 ? 'success.main' : 'error.main'}>
                          {item.pnl >= 0 ? '+' : ''}{fmt(item.pnl)}
                        </Typography>
                        <Typography variant="caption" color={item.pnlPercent >= 0 ? 'success.main' : 'error.main'}>
                          {item.pnlPercent >= 0 ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Yatırım Kar/Zarar
              </Typography>
              {pnlData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, pnlData.length * 30)}>
                  <BarChart data={pnlData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => fmt(v)} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="pnl" name="Kar/Zarar" barSize={18} radius={[0, 4, 4, 0]}>
                      {pnlData.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? '#4caf50' : '#f44336'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
                  Fiyat verisi bekleniyor...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Günlük Değişim (24s)
              </Typography>
              {dailyChangeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, dailyChangeData.length * 30)}>
                  <BarChart data={dailyChangeData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="change" name="Değişim %" barSize={18} radius={[0, 4, 4, 0]}>
                      {dailyChangeData.map((entry, i) => (
                        <Cell key={i} fill={entry.change >= 0 ? '#4caf50' : '#f44336'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
                  Fiyat verisi bekleniyor...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Aktif Görevler
              </Typography>
              {todos.filter((t) => !t.completed).length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {todos
                    .filter((t) => !t.completed)
                    .slice(0, 5)
                    .map((todo) => (
                      <Box
                        key={todo.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Typography>{todo.title}</Typography>
                        <Chip
                          label={todo.priority}
                          size="small"
                          color={
                            todo.priority === 'high'
                              ? 'error'
                              : todo.priority === 'medium'
                                ? 'warning'
                                : 'default'
                          }
                        />
                      </Box>
                    ))}
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Tüm görevler tamamlandı!
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StyleIcon sx={{ color: '#4da8da' }} />
                <Typography variant="h6">Kart Tekrarı</Typography>
              </Box>
              {flashStats && flashStats.totalCards > 0 ? (
                <>
                  <Box sx={{ display: 'flex', gap: 3, mb: 2.5 }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color={flashStats.due > 0 ? 'primary.main' : 'text.primary'}>
                        {flashStats.due}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        tekrara hazır
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {flashStats.reviewedToday}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        bugün çalışıldı
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {flashStats.streak}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        gün serisi
                      </Typography>
                    </Box>
                  </Box>
                  {flashStats.due > 0 ? (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<BoltIcon />}
                      onClick={() => router.push('/flashcards/all/study')}
                    >
                      Çalışmaya Başla ({flashStats.due})
                    </Button>
                  ) : (
                    <Typography color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                      Bugünlük tüm kartlar güncel 🎉
                    </Typography>
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Henüz kart yok. Aralıklı tekrarla öğrenmeye başla.
                  </Typography>
                  <Button variant="outlined" onClick={() => router.push('/flashcards')}>
                    Kartlara Git
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
