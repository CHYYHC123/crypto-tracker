import { KlineRestConfig } from '@/sidepanel/config/klineRest';
import type { KlineBar, KlineHistoryRequest, KlineHistorySource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

/** 币安股票 equity/kline/chart 单根 */
interface BarItem {
  t: number;
  ct: number;
  o: string;
  h: string;
  l: string;
  c: string;
  n: number;
  session: string | null;
  v: number;
  vw: string;
}

interface MarketResponse {
  code: string;
  message: string | null;
  messageDetail: string | null;
  data: {
    symbol: string;
    timeframe: string;
    adjustmentMode: string;
    bars: BarItem[];
  };
}

function parseBar(bar: BarItem): KlineBar | null {
  const openTime = Number(bar.t);
  if (!Number.isFinite(openTime)) return null;

  const open = Number(bar.o);
  const high = Number(bar.h);
  const low = Number(bar.l);
  const close = Number(bar.c);
  const volume = Number(bar.v);
  const vwap = Number(bar.vw);
  const closeTime = Number(bar.ct);

  return {
    openTime,
    time: Math.floor(openTime / 1000) as UTCTimestamp,
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : 0,
    // 成交额 ≈ 成交量 × VWAP
    quoteVolume: Number.isFinite(volume) && Number.isFinite(vwap) ? volume * vwap : 0,
    closeTime: Number.isFinite(closeTime) ? closeTime : openTime
  };
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const o = body as Record<string, unknown>;
  if (o.messageDetail) return String(o.messageDetail);
  if (o.message) return String(o.message);
  return fallback;
}

/** 币安股票：equity/kline/chart，symbol 为裸代码（如 AAPL） */
export const bnStockKlineSource: KlineHistorySource = {
  async fetch(query: KlineHistoryRequest, signal?: AbortSignal): Promise<KlineBar[]> {
    const endpoint = KlineRestConfig.BNStock;
    if (!endpoint?.path) {
      throw new Error('[kline] BNStock REST 配置不完整');
    }

    const timeframe = endpoint.intervals[query.interval];
    if (!timeframe) {
      throw new Error(`[kline] BNStock 不支持周期 ${query.interval}`);
    }

    const params = new URLSearchParams({
      symbol: query.symbol.toUpperCase(),
      timeframe,
      limit: String(query.limit),
      adjustmentMode: 'ADJUSTED'
    });
    if (query.endTime != null) {
      params.set('endTime', String(query.endTime));
    }

    const url = `${endpoint.baseUrl}${endpoint.path}?${params.toString()}`;
    const res = await fetch(url, { signal });
    const body: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(`[kline] BNStock 请求失败: ${readErrorMessage(body, res.statusText)}`);
    }

    // 成功码为 "000000"
    if (!body || typeof body !== 'object' || !('code' in body)) {
      throw new Error('[kline] BNStock 响应格式异常');
    }

    const resp = body as MarketResponse;
    if (resp.code !== '000000') {
      throw new Error(`[kline] BNStock 请求失败: ${readErrorMessage(body, resp.code)}`);
    }

    const barsRaw = resp.data?.bars;
    if (!Array.isArray(barsRaw)) {
      throw new Error('[kline] BNStock 响应缺少 bars');
    }

    const bars = barsRaw.map(parseBar).filter((b): b is KlineBar => b != null);
    bars.sort((a, b) => a.openTime - b.openTime);
    return bars;
  }
};
