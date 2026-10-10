import { Exchange, type ExchangeType } from '@/config/exchangeConfig';
import type { KlineHistorySource } from '@/types/kline';
import { bnKlineSource } from './sources/bn';

/** 已实现历史 K 线请求的交易所。新交易所在这里登记一行 */
export const KlineHistoryRegistry: Partial<Record<ExchangeType, KlineHistorySource>> = {
  [Exchange.BN]: bnKlineSource
};
