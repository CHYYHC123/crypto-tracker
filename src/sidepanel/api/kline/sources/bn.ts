import { Exchange } from '@/config/exchangeConfig';
import { KlineRestConfig } from '@/sidepanel/config/klineRest';
import type { KlineBar, KlineHistoryRequest, KlineHistorySource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

/** 币安 klines 12 元组里本层用到的前 8 项 */
type BnKlineRow = [number, string, string, string, string, string, number, string, ...unknown[]];

type BnStyleExchange = typeof Exchange.BN | typeof Exchange.BNFutures;

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

/** 币安现货 / U 本位合约：响应同为 klines 数组，只换 KlineRestConfig */
function createBnStyleSource(exchange: BnStyleExchange): KlineHistorySource {
  return {
    async fetch(query: KlineHistoryRequest, signal?: AbortSignal): Promise<KlineBar[]> {
      const endpoint = KlineRestConfig[exchange];
      if (!endpoint?.path) {
        throw new Error(`[kline] ${exchange} REST 配置不完整`);
      }

      const interval = endpoint.intervals[query.interval];
      if (!interval) {
        throw new Error(`[kline] ${exchange} 不支持周期 ${query.interval}`);
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
        throw new Error(`[kline] ${exchange} 请求失败: ${readErrorMessage(body, res.statusText)}`);
      }
      if (body && typeof body === 'object' && !Array.isArray(body) && 'code' in body) {
        throw new Error(`[kline] ${exchange} 请求失败: ${readErrorMessage(body, '未知错误')}`);
      }
      if (!Array.isArray(body)) {
        throw new Error(`[kline] ${exchange} 响应格式异常`);
      }

      return (body as BnKlineRow[]).map(parseBar);
    }
  };
}

export const bnKlineSource = createBnStyleSource(Exchange.BN);
export const bnFuturesKlineSource = createBnStyleSource(Exchange.BNFutures);
