import { KlineRestConfig } from '@/sidepanel/config/klineRest';

export interface BnTicker24h {
  lastPrice: number;
  /** 交易所返回的 24h 涨跌幅（%），勿本地重算 */
  priceChangePercent: number;
}

/**
 * 币安现货 24hr ticker：GET /api/v3/ticker/24hr?symbol=BTCUSDT
 * 直接使用响应里的 priceChangePercent
 */
export async function fetchBnTicker24h(symbol: string, signal?: AbortSignal): Promise<BnTicker24h> {
  const endpoint = KlineRestConfig.BN;
  if (!endpoint?.baseUrl) {
    throw new Error('[ticker] BN REST 配置不完整');
  }

  const pair = `${symbol.toUpperCase()}USDT`;
  const url = `${endpoint.baseUrl}/api/v3/ticker/24hr?symbol=${encodeURIComponent(pair)}`;
  const res = await fetch(url, { signal });
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'msg' in body && body.msg ? String(body.msg) : res.statusText;
    throw new Error(`[ticker] BN 请求失败: ${msg}`);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('[ticker] BN 响应格式异常');
  }

  const d = body as { lastPrice?: string; priceChangePercent?: string };
  const lastPrice = Number(d.lastPrice);
  const priceChangePercent = Number(d.priceChangePercent);
  if (!Number.isFinite(lastPrice) || !Number.isFinite(priceChangePercent)) {
    throw new Error('[ticker] BN 字段无效');
  }

  return { lastPrice, priceChangePercent };
}
