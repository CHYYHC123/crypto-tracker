import { KlineRestConfig } from '@/sidepanel/config/klineRest';
import type { ExchangeType } from '@/config/exchangeConfig';
import type { KlineBar, KlineHistoryQuery } from '@/types/kline';
import { KlineHistoryRegistry } from './registry';

const DEFAULT_LIMIT = 500;

/** 按交易所 maxLimit 裁剪后的实际请求 limit，供 hasMore 判断 */
export function getKlinePageLimit(exchange: ExchangeType, requested = DEFAULT_LIMIT): number {
  const endpoint = KlineRestConfig[exchange];
  if (!endpoint) return Math.max(requested, 1);
  return Math.min(Math.max(requested, 1), endpoint.maxLimit);
}

/**
 * 拉取一页历史 K 线。
 * 向左翻页时由调用方传入 endTime = 当前最旧一根的 openTime - 1。
 */
export async function fetchKlineHistory(query: KlineHistoryQuery, signal?: AbortSignal): Promise<KlineBar[]> {
  const endpoint = KlineRestConfig[query.exchange];
  if (!endpoint?.path) {
    throw new Error(`[kline] 交易所 ${query.exchange} 尚未配置历史 K 线接口`);
  }
  if (!endpoint.intervals[query.interval]) {
    throw new Error(`[kline] ${query.exchange} 不支持周期 ${query.interval}`);
  }

  const source = KlineHistoryRegistry[query.exchange];
  if (!source) {
    throw new Error(`[kline] 交易所 ${query.exchange} 尚未实现历史 K 线请求`);
  }

  const limit = getKlinePageLimit(query.exchange, query.limit ?? DEFAULT_LIMIT);

  return source.fetch({ ...query, limit }, signal);
}
