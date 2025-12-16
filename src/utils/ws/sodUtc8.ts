import { Ticker } from './parseTicker';

const cache = new Map<string, number>();
let currentDate = getUtc8Date();

function getUtc8Date() {
  const now = Date.now();
  const utc8 = new Date(now + 8 * 3600 * 1000);
  return utc8.toISOString().slice(0, 10);
}

export function fillSodUtc8(ticker: Ticker): Ticker {
  const today = getUtc8Date();

  if (today !== currentDate) {
    cache.clear();
    currentDate = today;
  }

  const key = `${ticker.exchange}_${ticker.symbol}`;

  if (ticker.sodUtc8 && ticker.sodUtc8 > 0) {
    cache.set(key, ticker.sodUtc8);
    return ticker;
  }

  if (!cache.has(key)) {
    cache.set(key, ticker.last);
  }

  ticker.sodUtc8 = cache.get(key)!;
  return ticker;
}
