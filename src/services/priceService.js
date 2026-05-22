import { proxyFetchText } from '@/lib/apiClient';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

async function fetchYahooPrice(yahooSymbol) {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`;
    const body = await proxyFetchText(url);
    const data = JSON.parse(body);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      price,
      change24h: change,
      currency: meta.currency,
    };
  } catch (e) {
    console.error(`Yahoo Finance error [${yahooSymbol}]:`, e);
    return null;
  }
}

function toYahooSymbol(type, symbol) {
  const s = symbol.toUpperCase();
  switch (type) {
    case 'stock':
      return s.endsWith('.IS') ? s : `${s}.IS`;
    case 'stock_us':
      return s;
    case 'crypto':
      return s.endsWith('-USD') ? s : `${s}-USD`;
    case 'gold':
      return 'GC=F';
    case 'silver':
      return 'SI=F';
    case 'forex':
      if (s === 'TRY') return null;
      return `${s}TRY=X`;
    default:
      return null;
  }
}

export async function fetchAllPrices(investments) {
  const symbolMap = [];

  for (const inv of investments) {
    if (!inv.symbol) continue;
    const yahooSymbol = toYahooSymbol(inv.type, inv.symbol);
    if (!yahooSymbol) continue;
    symbolMap.push({ invId: inv.id, yahooSymbol, type: inv.type });
  }

  const uniqueSymbols = [...new Set(symbolMap.map((s) => s.yahooSymbol))];

  if (!uniqueSymbols.includes('USDTRY=X')) uniqueSymbols.push('USDTRY=X');
  if (!uniqueSymbols.includes('EURTRY=X')) uniqueSymbols.push('EURTRY=X');

  const results = await Promise.all(
    uniqueSymbols.map(async (sym) => {
      const data = await fetchYahooPrice(sym);
      return { symbol: sym, data };
    })
  );

  const priceLookup = {};
  for (const r of results) {
    if (r.data) priceLookup[r.symbol] = r.data;
  }

  const usdTryRate = priceLookup['USDTRY=X']?.price || null;
  const eurTryRate = priceLookup['EURTRY=X']?.price || null;

  const priceMap = {};
  for (const entry of symbolMap) {
    const raw = priceLookup[entry.yahooSymbol];
    if (!raw) continue;

    let tryPrice = raw.price;

    if (raw.currency === 'USD' && usdTryRate) {
      tryPrice = raw.price * usdTryRate;
    } else if (raw.currency === 'EUR' && eurTryRate) {
      tryPrice = raw.price * eurTryRate;
    }

    if (entry.type === 'gold' || entry.type === 'silver') {
      tryPrice = tryPrice / 31.1035;
    }

    const usdPrice = usdTryRate ? tryPrice / usdTryRate : tryPrice;
    const eurPrice = eurTryRate ? tryPrice / eurTryRate : tryPrice;

    priceMap[entry.invId] = {
      try: tryPrice,
      usd: usdPrice,
      eur: eurPrice,
      change24h: raw.change24h,
    };
  }

  return { prices: priceMap, rates: { usdtry: usdTryRate, eurtry: eurTryRate } };
}

export async function getCurrentPrice(type, symbol) {
  const fakeInv = { id: 'tmp', type, symbol };
  const { prices } = await fetchAllPrices([fakeInv]);
  return prices['tmp'] || null;
}

export async function fetchPriceHistory(type, symbol, startDate, endDate) {
  if (!symbol) return {};
  const yahooSymbol = toYahooSymbol(type, symbol);
  if (!yahooSymbol) return {};

  try {
    const p1 = Math.floor(new Date(startDate).getTime() / 1000);
    const p2 = Math.floor(new Date(endDate).getTime() / 1000) + 86400;
    const url = `${YAHOO_BASE}/${encodeURIComponent(yahooSymbol)}?period1=${p1}&period2=${p2}&interval=1d`;
    const body = await proxyFetchText(url);
    const data = JSON.parse(body);
    const result = data?.chart?.result?.[0];
    if (!result) return {};

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const currency = result.meta?.currency;

    const history = {};
    timestamps.forEach((ts, i) => {
      if (closes[i] != null) {
        const date = new Date(ts * 1000).toISOString().split('T')[0];
        history[date] = { price: closes[i], currency };
      }
    });
    return history;
  } catch (e) {
    console.error(`Price history error [${type}/${symbol}]:`, e);
    return {};
  }
}

export async function fetchHistoricalPrice(type, symbol, dateStr) {
  if (!symbol || !dateStr) return null;
  const yahooSymbol = toYahooSymbol(type, symbol);
  if (!yahooSymbol) return null;

  try {
    const date = new Date(dateStr);
    const period1 = Math.floor(date.getTime() / 1000);
    const period2 = period1 + 86400 * 5;

    const url = `${YAHOO_BASE}/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d`;
    const body = await proxyFetchText(url);
    const data = JSON.parse(body);
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const close = result.indicators?.quote?.[0]?.close;
    if (!close || close.length === 0) return null;

    const price = close.find((p) => p !== null);
    if (!price) return null;

    return { price, currency: result.meta?.currency };
  } catch (e) {
    console.error(`Historical price error [${yahooSymbol}, ${dateStr}]:`, e);
    return null;
  }
}
