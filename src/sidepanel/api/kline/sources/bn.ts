import { KlineRestConfig } from '@/sidepanel/config/klineRest';
import type { KlineBar, KlineHistoryRequest, KlineHistorySource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

/** 币安 klines 12 元组里本层用到的前 8 项 */
type BnKlineRow = [number, string, string, string, string, string, number, string, ...unknown[]];

function parseBar(row: BnKlineRow): KlineBar {
  const openTime = row[0];
  return {
    openTime,
    time: Math.floor(openTime / 1000) as UTCTimestamp,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    closeTime: row[6],
    quoteVolume: Number(row[7])
  };
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'msg' in body && body.msg) {
    return String(body.msg);
  }
  return fallback;
}

/** 币安现货：读 KlineRestConfig.BN 拼 URL，并把响应解析成 KlineBar */
export const bnKlineSource: KlineHistorySource = {
  async fetch(query: KlineHistoryRequest, signal?: AbortSignal): Promise<KlineBar[]> {
    const endpoint = KlineRestConfig.BN;
    if (!endpoint?.path) {
      throw new Error('[kline] BN REST 配置不完整');
    }

    const interval = endpoint.intervals[query.interval];
    if (!interval) {
      throw new Error(`[kline] BN 不支持周期 ${query.interval}`);
    }

    const params = new URLSearchParams({
      symbol: `${query.symbol.toUpperCase()}USDT`,
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
      throw new Error(`[kline] BN 请求失败: ${readErrorMessage(body, res.statusText)}`);
    }
    if (body && typeof body === 'object' && !Array.isArray(body) && 'code' in body) {
      throw new Error(`[kline] BN 请求失败: ${readErrorMessage(body, '未知错误')}`);
    }
    if (!Array.isArray(body)) {
      throw new Error('[kline] BN 响应格式异常');
    }

    return (body as BnKlineRow[]).map(parseBar);
  }
};
