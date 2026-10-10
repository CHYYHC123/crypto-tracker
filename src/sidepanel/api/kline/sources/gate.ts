import { KlineRestConfig } from '@/sidepanel/config/klineRest';
import type { KlineBar, KlineHistoryRequest, KlineHistorySource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

/**
 * Gate candlesticks 行：
 * [t(秒), quote_volume, close, high, low, open, base_volume, is_closed?]
 */
type GateCandleRow = [string, string, string, string, string, string, string, ...unknown[]];

function parseBar(row: GateCandleRow): KlineBar {
  const openTimeSec = Number(row[0]);
  const openTime = openTimeSec * 1000;
  return {
    openTime,
    time: openTimeSec as UTCTimestamp,
    open: Number(row[5]),
    high: Number(row[3]),
    low: Number(row[4]),
    close: Number(row[2]),
    volume: Number(row[6]),
    quoteVolume: Number(row[1]),
    closeTime: openTime
  };
}

/** Gate 现货：to 为秒级时间戳上限；保证返回旧→新 */
export const gateKlineSource: KlineHistorySource = {
  async fetch(query: KlineHistoryRequest, signal?: AbortSignal): Promise<KlineBar[]> {
    const endpoint = KlineRestConfig.Gate;
    if (!endpoint?.path) {
      throw new Error('[kline] Gate REST 配置不完整');
    }

    const interval = endpoint.intervals[query.interval];
    if (!interval) {
      throw new Error(`[kline] Gate 不支持周期 ${query.interval}`);
    }

    const params = new URLSearchParams({
      currency_pair: `${query.symbol.toUpperCase()}_USDT`,
      interval,
      limit: String(query.limit)
    });
    // Gate to：秒；只返回不晚于该时间的 K 线
    if (query.endTime != null) {
      params.set('to', String(Math.floor(query.endTime / 1000)));
    }

    const url = `${endpoint.baseUrl}${endpoint.path}?${params.toString()}`;
    const res = await fetch(url, { signal });
    const body: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        body && typeof body === 'object' && 'message' in body ? String((body as { message: unknown }).message) : res.statusText;
      throw new Error(`[kline] Gate 请求失败: ${msg}`);
    }
    if (!Array.isArray(body)) {
      throw new Error('[kline] Gate 响应格式异常');
    }

    const bars = (body as GateCandleRow[]).map(parseBar);
    bars.sort((a, b) => a.openTime - b.openTime);
    return bars;
  }
};
