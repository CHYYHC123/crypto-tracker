import type { ExchangeType } from '@/config/exchangeConfig';
import type { UTCTimestamp } from 'lightweight-charts';

/** 侧边栏周期，与各交易所 API 的 interval 字符串分开 */
export type KlineInterval = '1m' | '30m' | '1h' | '1d' | '1w';

/** 统一后的单根 K 线。time 为秒，供 lightweight-charts 使用 */
export interface KlineBar {
  openTime: number;
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  closeTime: number;
}

export interface VolumeInfo {
  volume: number;
  quoteVolume: number;
}

export interface KlineHistoryQuery {
  exchange: ExchangeType;
  /** 基础币种，如 BTC。交易对格式由各交易所适配器拼接 */
  symbol: string;
  interval: KlineInterval;
  /** 不传时由入口使用默认值，并按该所 maxLimit 裁剪 */
  limit?: number;
  /** 毫秒。传入时只返回开盘时间不晚于该值的 K 线，用于向左翻页 */
  endTime?: number;
}

export interface KlineRestEndpoint {
  baseUrl: string;
  path: string;
  maxLimit: number;
  /** 内部周期 → 该所 API 的 interval 字符串。缺省表示暂不支持 */
  intervals: Partial<Record<KlineInterval, string>>;
}

/** limit 已由入口解析并裁剪 */
export interface KlineHistoryRequest extends KlineHistoryQuery {
  limit: number;
}

/** 单个交易所的历史 K 线请求。只负责拼参和解析，不负责校验是否已注册 */
export interface KlineHistorySource {
  fetch(query: KlineHistoryRequest, signal?: AbortSignal): Promise<KlineBar[]>;
}
