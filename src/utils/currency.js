const CURRENCY_CONFIG = {
  TRY: { symbol: '₺', locale: 'tr-TR' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
};

export const CURRENCIES = [
  { value: 'TRY', label: '₺ Türk Lirası (TRY)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
];

export function formatCurrency(value, currency = 'TRY') {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.TRY;
  return `${config.symbol}${value.toLocaleString(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getPriceKey(currency) {
  return currency.toLowerCase();
}

function getNativeCurrency(type) {
  switch (type) {
    case 'stock': return 'TRY';
    case 'stock_us': return 'USD';
    case 'crypto': return 'USD';
    case 'gold': return 'USD';
    case 'silver': return 'USD';
    case 'forex': return 'TRY';
    default: return 'TRY';
  }
}

export function convertBuyPrice(buyPrice, type, displayCurrency, rates) {
  if (!rates) return buyPrice;

  const native = getNativeCurrency(type);

  let tryPrice = buyPrice;
  if (native === 'USD' && rates.usdtry) {
    tryPrice = buyPrice * rates.usdtry;
  } else if (native === 'EUR' && rates.eurtry) {
    tryPrice = buyPrice * rates.eurtry;
  }

  if (type === 'gold' || type === 'silver') {
    tryPrice = tryPrice / 31.1035;
  }

  if (displayCurrency === 'TRY') return tryPrice;
  if (displayCurrency === 'USD' && rates.usdtry) return tryPrice / rates.usdtry;
  if (displayCurrency === 'EUR' && rates.eurtry) return tryPrice / rates.eurtry;
  return tryPrice;
}
