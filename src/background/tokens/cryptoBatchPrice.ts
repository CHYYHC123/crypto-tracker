import type { AssetItem } from '@/types/asset';
import type { ExchangeType } from '@/config/exchangeConfig';
import { getAssetType } from '@/utils/local';

const CACHE_TTL = 30_000;

// per-exchange 独立缓存
const snapshotCache = new Map<string, { data: AssetItem[]; expiredAt: number }>();

function toAssetItem(symbol: string, price: number, changePercent: number): AssetItem {
  const sym = symbol.toUpperCase();
  return {
    id: sym.toLowerCase(),
    symbol: sym,
    category: 'crypto' as const,
    price,
    change: Number(changePercent.toFixed(2)),
    lastPrice: 0
  };
}

// OKX REST
// GET https://www.okx.com/api/v5/market/tickers?instType=SPOT
// 返回所有 SPOT ticker，客户端过滤目标 symbol

async function fetchOKXSnapshot(tokenList: string[]): Promise<AssetItem[]> {
  const symbolSet = new Set(tokenList.map(s => s.toUpperCase()));
  const resp = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT', { signal: AbortSignal.timeout(5000) });
  const json = await resp.json();
  if (json?.code !== '0' || !Array.isArray(json.data)) return [];

  const result: AssetItem[] = [];
  for (const d of json.data) {
    // instId 格式: "BTC-USDT"，只取 USDT 计价对
    if (!d.instId?.endsWith('-USDT')) continue;
    const sym = d.instId.slice(0, -5).toUpperCase();
    if (!symbolSet.has(sym)) continue;

    const last = Number(d.last);
    const open24h = Number(d.open24h);
    if (!last) continue;

    const change = open24h > 0 ? ((last - open24h) / open24h) * 100 : 0;
    result.push(toAssetItem(sym, last, change));
  }
  return result;
}

// Binance (BN) REST
// GET https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT"]
// 精确拉取目标 symbol，避免拉全量（节省 weight）

async function fetchBNSnapshot(tokenList: string[]): Promise<AssetItem[]> {
  if (!tokenList.length) return [];
  const symbols = JSON.stringify(tokenList.map(s => `${s.toUpperCase()}USDT`));
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const json = await resp.json();
  if (!Array.isArray(json)) return [];

  return json
    .filter((d: any) => d.lastPrice && Number(d.lastPrice) > 0)
    .map((d: any) => {
      // symbol 格式: "BTCUSDT"
      const sym = d.symbol.endsWith('USDT') ? d.symbol.slice(0, -4) : d.symbol;
      return toAssetItem(sym, Number(d.lastPrice), Number(d.priceChangePercent));
    });
}

// Gate REST
// GET https://api.gateio.ws/api/v4/spot/tickers
// 返回所有 ticker，客户端过滤

async function fetchGateSnapshot(tokenList: string[]): Promise<AssetItem[]> {
  const symbolSet = new Set(tokenList.map(s => s.toUpperCase()));
  const resp = await fetch('https://api.gateio.ws/api/v4/spot/tickers', { signal: AbortSignal.timeout(5000) });
  const json = await resp.json();
  if (!Array.isArray(json)) return [];

  const result: AssetItem[] = [];
  for (const d of json) {
    // currency_pair 格式: "BTC_USDT"，只取 USDT 计价对
    if (!d.currency_pair?.endsWith('_USDT')) continue;
    const sym = d.currency_pair.slice(0, -5).toUpperCase();
    if (!symbolSet.has(sym)) continue;

    const last = Number(d.last);
    if (!last) continue;

    result.push(toAssetItem(sym, last, Number(d.change_percentage)));
  }
  return result;
}

// ─── 主入口

/**
 * 按交易所拉取 crypto 批量快照价格（30s TTL 缓存）
 * 失败时返回空数组，不抛异常（由调用方降级处理）
 */
export async function getCryptoBatchPrice(exchange: ExchangeType, tokenList: string[]): Promise<AssetItem[]> {
  if (!tokenList.length) return [];

  const assetType = await getAssetType();
  if (assetType === 'stocks') {
    snapshotCache.clear();
  }

  const cacheKey = `${exchange}:${tokenList.slice().sort().join(',')}`;
  const now = Date.now();
  const hit = snapshotCache.get(cacheKey);
  if (hit && now < hit.expiredAt) {
    console.log(`[CryptoBatchPrice] 命中缓存 (${exchange})，跳过网络请求`);
    return hit.data;
  }

  let data: AssetItem[] = [];
  try {
    if (exchange === 'OKX') {
      data = await fetchOKXSnapshot(tokenList);
    } else if (exchange === 'BN') {
      data = await fetchBNSnapshot(tokenList);
    } else if (exchange === 'Gate') {
      data = await fetchGateSnapshot(tokenList);
    } else {
      // HL / 未知交易所：暂不支持快照，直接返回空
      console.warn(`[CryptoBatchPrice] 交易所 ${exchange} 不支持 REST 快照，跳过`);
      return [];
    }
  } catch (err) {
    console.warn(`[CryptoBatchPrice] ${exchange} 快照请求失败:`, err);
    return [];
  }

  snapshotCache.set(cacheKey, { data, expiredAt: now + CACHE_TTL });
  return data;
}
