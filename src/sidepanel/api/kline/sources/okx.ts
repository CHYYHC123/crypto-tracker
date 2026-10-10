import { KlineRestConfig } from '@/sidepanel/config/klineRest';
import type { KlineBar, KlineHistoryRequest, KlineHistorySource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

/** OKX candles 行：[ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm] */
type OkxCandleRow = [string, string, string, string, string, string, string, string, string, ...unknown[]];

function parseBar(row: OkxCandleRow): KlineBar {
  const openTime = Number(row[0]);
  return {
    openTime,
    time: Math.floor(openTime / 1000) as UTCTimestamp,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    quoteVolume: Number(row[7] ?? row[6]),
    closeTime: openTime
  };
}

/** OKX 现货：after = 取该 ts 之前更早的数据；响应默认可为新→旧 */
export const okxKlineSource: KlineHistorySource = {
  async fetch(query: KlineHistoryRequest, signal?: AbortSignal): Promise<KlineBar[]> {
    const endpoint = KlineRestConfig.OKX;
    if (!endpoint?.path) {
      throw new Error('[kline] OKX REST 配置不完整');
    }

    const bar = endpoint.intervals[query.interval];
    if (!bar) {
      throw new Error(`[kline] OKX 不支持周期 ${query.interval}`);
    }

    const params = new URLSearchParams({
      instId: `${query.symbol.toUpperCase()}-USDT`,
      bar,
      limit: String(query.limit)
    });
    // OKX after：返回比该时间戳更早的数据（用于向左翻页）
    if (query.endTime != null) {
      params.set('after', String(query.endTime));
    }

    const url = `${endpoint.baseUrl}${endpoint.path}?${params.toString()}`;
    const res = await fetch(url, { signal });
    const body: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(`[kline] OKX 请求失败: ${res.statusText}`);
    }
    if (!body || typeof body !== 'object' || !('code' in body)) {
      throw new Error('[kline] OKX 响应格式异常');
    }

    const payload = body as { code: string; msg?: string; data?: OkxCandleRow[] };
    if (payload.code !== '0') {
      throw new Error(`[kline] OKX 请求失败: ${payload.msg || payload.code}`);
    }
    if (!Array.isArray(payload.data)) {
      throw new Error('[kline] OKX 响应 data 异常');
    }

    const bars = payload.data.map(parseBar);
    // OKX 默认新→旧，统一为旧→新
    bars.reverse();
    return bars;
  }
};
