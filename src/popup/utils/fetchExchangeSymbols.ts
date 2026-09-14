/** 统一标的条目 */
export interface ExchangeSymbol {
  symbol: string;
}

// ─── 内存缓存 ────────────────────────────────────────────────────────────────

const cache: Partial<Record<'bn_spot' | 'bn_futures' | 'okx' | 'gate', ExchangeSymbol[]>> = {};

// ─── Binance 现货

/**
 * 从 Binance 现货 REST API 拉取 USDT 交易对列表
 * https://api.binance.com/api/v3/exchangeInfo
 */
export async function fetchBinanceSpotSymbols(): Promise<ExchangeSymbol[] | null> {
  if (cache.bn_spot) return cache.bn_spot;
  try {
    const res = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const json = await res.json();
    if (!Array.isArray(json.symbols)) return null;
    const result: ExchangeSymbol[] = (json.symbols as Array<{ baseAsset: string; quoteAsset: string; status: string }>).filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT').map(s => ({ symbol: s.baseAsset }));
    console.log('result_res', result);
    cache.bn_spot = result;
    return result;
  } catch {
    return null;
  }
}

// ─── Binance 合约（U 本位永续）

/**
 * 从 Binance 合约 REST API 拉取 USDT 永续合约列表
 * https://fapi.binance.com/fapi/v1/exchangeInfo
 */
export async function fetchBinanceFuturesSymbols(): Promise<ExchangeSymbol[] | null> {
  if (cache.bn_futures) return cache.bn_futures;
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
    const json = await res.json();
    if (!Array.isArray(json.symbols)) return null;
    const result: ExchangeSymbol[] = (json.symbols as Array<{ baseAsset: string; quoteAsset: string; status: string }>).filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT').map(s => ({ symbol: s.baseAsset }));
    console.log('result_res',result)
    cache.bn_futures = result;
    return result;
  } catch {
    return null;
  }
}

// ─── OKX 现货

/**
 * 从 OKX 现货公开 API 拉取 USDT 交易对列表
 * https://www.okx.com/api/v5/public/instruments?instType=SPOT
 */
export async function fetchOkxSymbols(): Promise<ExchangeSymbol[] | null> {
  if (cache.okx) return cache.okx;
  try {
    const res = await fetch('https://www.okx.com/api/v5/public/instruments?instType=SPOT');
    const json = await res.json();
    if (!Array.isArray(json.data)) return null;
    const result: ExchangeSymbol[] = (json.data as Array<{ baseCcy: string; quoteCcy: string; state: string }>).filter(s => s.state === 'live' && s.quoteCcy === 'USDT').map(s => ({ symbol: s.baseCcy }));
    cache.okx = result;
    return result;
  } catch {
    return null;
  }
}

// ─── Gate.io 现货

/**
 * 从 Gate.io 现货公开 API 拉取 USDT 交易对列表
 * https://api.gateio.ws/api/v4/spot/currency_pairs
 */
export async function fetchGateSymbols(): Promise<ExchangeSymbol[] | null> {
  if (cache.gate) return cache.gate;
  try {
    const res = await fetch('https://api.gateio.ws/api/v4/spot/currency_pairs');
    const json = await res.json();
    if (!Array.isArray(json)) return null;
    const result: ExchangeSymbol[] = (json as Array<{ base: string; quote: string; trade_status: string }>).filter(s => s.quote === 'USDT' && s.trade_status === 'tradable').map(s => ({ symbol: s.base }));
    cache.gate = result;
    return result;
  } catch {
    return null;
  }
}
