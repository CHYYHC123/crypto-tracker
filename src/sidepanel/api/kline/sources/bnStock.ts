import { KlineRestConfig } from '@/sidepanel/config/klineRest';
import type { KlineBar, KlineHistoryRequest, KlineHistorySource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

/** 币安股票 kline 常见数组行：[openTime, open, high, low, close, volume, closeTime?, quoteVolume?] */
type BnStockRow = Array<string | number>;

function toEquitySymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  return upper.startsWith('EQ_') ? upper : `EQ_${upper}`;
}

function parseBar(row: BnStockRow): KlineBar | null {
  if (!Array.isArray(row) || row.length < 5) return null;
  const openTime = Number(row[0]);
  if (!Number.isFinite(openTime)) return null;

  const open = Number(row[1]);
  const high = Number(row[2]);
  const low = Number(row[3]);
  const close = Number(row[4]);
  const volume = row.length > 5 ? Number(row[5]) : 0;
  const closeTime = row.length > 6 ? Number(row[6]) : openTime;
  const quoteVolume = row.length > 7 ? Number(row[7]) : 0;

  return {
    openTime,
    time: Math.floor(openTime / 1000) as UTCTimestamp,
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : 0,
    quoteVolume: Number.isFinite(quoteVolume) ? quoteVolume : 0,
    closeTime: Number.isFinite(closeTime) ? closeTime : openTime
  };
}

function extractRows(body: unknown): BnStockRow[] | null {
  if (Array.isArray(body)) return body as BnStockRow[];
  if (!body || typeof body !== 'object') return null;

  const o = body as Record<string, unknown>;
  // 常见包一层 { code, data } 或 { data: { klines } }
  if (Array.isArray(o.data)) return o.data as BnStockRow[];
  if (o.data && typeof o.data === 'object') {
    const data = o.data as Record<string, unknown>;
    if (Array.isArray(data.klines)) return data.klines as BnStockRow[];
    if (Array.isArray(data.klineInfos)) return data.klineInfos as BnStockRow[];
    if (Array.isArray(data.list)) return data.list as BnStockRow[];
  }
  return null;
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const o = body as Record<string, unknown>;
  if (o.msg) return String(o.msg);
  if (o.message) return String(o.message);
  return fallback;
}

/** 币安股票：EQ_ 前缀 + public equity kline/query */
export const bnStockKlineSource: KlineHistorySource = {
  async fetch(query: KlineHistoryRequest, signal?: AbortSignal): Promise<KlineBar[]> {
    const endpoint = KlineRestConfig.BNStock;
    if (!endpoint?.path) {
      throw new Error('[kline] BNStock REST 配置不完整');
    }

    const interval = endpoint.intervals[query.interval];
    if (!interval) {
      throw new Error(`[kline] BNStock 不支持周期 ${query.interval}`);
    }

    const params = new URLSearchParams({
      symbol: toEquitySymbol(query.symbol),
      interval,
      limit: String(query.limit)
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

    // bapi 成功码多为 "000000"
    if (body && typeof body === 'object' && 'code' in body) {
      const code = String((body as { code: unknown }).code);
      if (code !== '000000' && code !== '0') {
        throw new Error(`[kline] BNStock 请求失败: ${readErrorMessage(body, code)}`);
      }
    }

    const rows = extractRows(body);
    if (!rows) {
      throw new Error('[kline] BNStock 响应格式异常');
    }

    const bars = rows.map(parseBar).filter((b): b is KlineBar => b != null);
    bars.sort((a, b) => a.openTime - b.openTime);
    return bars;
  }
};
