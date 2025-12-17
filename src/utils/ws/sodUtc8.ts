import { Ticker } from './parseTicker';
import { ExchangeType } from '@/config/exchangeConfig';

// 开盘价缓存：key = "交易所_币种-USDT"，value = 开盘价
const cache = new Map<string, number>();
let currentDate = getUtc8Date();

/**
 * 获取当前 UTC+8 日期字符串，如 "2025-12-17"
 */
export function getUtc8Date(): string {
  const now = Date.now();
  const utc8 = new Date(now + 8 * 3600 * 1000);
  return utc8.toISOString().slice(0, 10);
}

/**
 * 检查缓存是否过期（跨天）
 */
function checkAndClearExpiredCache(): void {
  const today = getUtc8Date();
  if (today !== currentDate) {
    console.log(`[sodUtc8] 跨天检测：${currentDate} → ${today}，清除缓存`);
    cache.clear();
    currentDate = today;
  }
}

/**
 * 获取缓存的开盘价
 */
export function getCachedOpenPrice(exchange: ExchangeType, symbol: string): number | undefined {
  checkAndClearExpiredCache();
  const key = `${exchange}_${symbol}`;
  return cache.get(key);
}

/**
 * 设置开盘价缓存
 */
export function setCachedOpenPrice(exchange: ExchangeType, symbol: string, price: number): void {
  checkAndClearExpiredCache();
  const key = `${exchange}_${symbol}`;
  cache.set(key, price);
}

/**
 * 批量预取开盘价（从 REST API）
 * @param exchange 交易所类型
 * @param tokenList 币种列表，如 ['BTC', 'ETH']
 */
export async function prefetchOpenPrices(exchange: ExchangeType, tokenList: string[]): Promise<void> {
  checkAndClearExpiredCache();

  // OKX 不需要预取，WebSocket 会返回 sodUtc8
  if (exchange === 'OKX') {
    console.log('[sodUtc8] OKX 不需要预取开盘价');
    return;
  }

  // 过滤出未缓存的币种
  const uncachedTokens = tokenList.filter(token => {
    const key = `${exchange}_${token}-USDT`;
    return !cache.has(key);
  });

  if (uncachedTokens.length === 0) {
    console.log('[sodUtc8] 所有币种开盘价已缓存');
    return;
  }

  console.log(`[sodUtc8] 开始获取 ${exchange} 开盘价:`, uncachedTokens);

  // 并发请求所有未缓存币种的开盘价
  const promises = uncachedTokens.map(token => fetchOpenPrice(exchange, token));
  await Promise.allSettled(promises);

  console.log('[sodUtc8] 开盘价缓存完成，当前缓存:', Object.fromEntries(cache));
}

/**
 * 从 REST API 获取单个币种的开盘价
 */
async function fetchOpenPrice(exchange: ExchangeType, token: string): Promise<void> {
  try {
    let openPrice: number | null = null;

    if (exchange === 'Gate') {
      // Gate K线 API
      const url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${token}_USDT&interval=1d&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      // Gate 返回: [[timestamp, volume, close, high, low, open], ...]
      // 开盘价是第 6 个元素（索引 5）
      if (Array.isArray(data) && data[0] && data[0][5]) {
        openPrice = Number(data[0][5]);
      }
    } else if (exchange === 'BN') {
      // Binance K线 API
      const url = `https://api.binance.com/api/v3/klines?symbol=${token}USDT&interval=1d&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      // Binance 返回: [[openTime, open, high, low, close, ...], ...]
      // 开盘价是第 2 个元素（索引 1）
      if (Array.isArray(data) && data[0] && data[0][1]) {
        openPrice = Number(data[0][1]);
      }
    }

    if (openPrice && openPrice > 0) {
      const key = `${exchange}_${token}-USDT`;
      cache.set(key, openPrice);
      console.log(`[sodUtc8] ${key} 开盘价: ${openPrice}`);
    }
  } catch (err) {
    console.warn(`[sodUtc8] 获取 ${exchange} ${token} 开盘价失败:`, err);
  }
}

/**
 * 填充 Ticker 的 sodUtc8 字段
 * - OKX: 直接使用 WebSocket 返回的 sodUtc8
 * - Gate/BN: 从缓存获取预取的开盘价
 */
export function fillSodUtc8(ticker: Ticker): Ticker {
  checkAndClearExpiredCache();

  const key = `${ticker.exchange}_${ticker.symbol}`;

  // 如果 ticker 已经有 sodUtc8（OKX），缓存并返回
  if (ticker.sodUtc8 && ticker.sodUtc8 > 0) {
    cache.set(key, ticker.sodUtc8);
    return ticker;
  }

  // 从缓存获取开盘价
  const cachedPrice = cache.get(key);
  if (cachedPrice && cachedPrice > 0) {
    ticker.sodUtc8 = cachedPrice;
    return ticker;
  }

  // 如果缓存中没有（理论上不应该发生，因为 prefetch 会预取）
  // Fallback: 使用当前价格（保持原有逻辑）
  console.warn(`[sodUtc8] ${key} 无缓存，使用当前价格作为 fallback`);
  cache.set(key, ticker.last);
  ticker.sodUtc8 = ticker.last;

  return ticker;
}
